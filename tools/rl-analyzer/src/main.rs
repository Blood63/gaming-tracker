mod calc;
mod ingest;
use std::io::Write;

fn usage() -> ! {
    eprintln!("rl-analyze <fichier.replay> [--me-name NOM]... [--me-epic ID]... [--tz-offset-min N] [--out DOSSIER] [--debug] [--pretty]\n  Analyse locale d'un replay Rocket League. Écrit le JSON (stdout, ou DOSSIER/<id>.json + <id>.sum.json).");
    std::process::exit(2)
}
/// rl-analyzer index-merge <index.json> <entrée.idx.json>... --out <nouvel index.json>
/// Fusionne des entrées d'index (par id, sans remplacer l'existant), trie par date, écrit un JSON compact.
/// Affiche {"added":[...],"present":[...]}. Un index absent ou vide est traité comme vide ; un index illisible = erreur (code 6).
fn index_merge(a: &[String]) -> ! {
    let mut files: Vec<&String> = vec![]; let mut out: Option<&String> = None; let mut i = 3;
    while i < a.len() { if a[i] == "--out" { i += 1; out = a.get(i); } else { files.push(&a[i]); } i += 1; }
    let Some(out) = out else { usage() };
    let mut idx: serde_json::Value = match std::fs::read(&a[2]) {
        Ok(b) if b.iter().all(|c| c.is_ascii_whitespace()) => serde_json::json!({"v":1,"replays":[]}),
        Ok(b) => match serde_json::from_slice(&b) { Ok(v) => v, Err(e) => { eprintln!("index illisible : {e}"); std::process::exit(6) } },
        Err(_) => serde_json::json!({"v":1,"replays":[]}),
    };
    let Some(list) = idx.get_mut("replays").and_then(|r| r.as_array_mut()) else { eprintln!("index sans « replays »"); std::process::exit(6) };
    let (mut added, mut present) = (vec![], vec![]);
    for f in files {
        let e: serde_json::Value = match std::fs::read(f).ok().and_then(|b| serde_json::from_slice(&b).ok()) { Some(v) => v, None => { eprintln!("entrée illisible : {f}"); std::process::exit(6) } };
        let id = e.get("id").and_then(|x| x.as_str()).unwrap_or("").to_string();
        if id.is_empty() { eprintln!("entrée sans id : {f}"); std::process::exit(6); }
        if list.iter().any(|x| x.get("id").and_then(|y| y.as_str()) == Some(id.as_str())) { present.push(id); } else { list.push(e); added.push(id); }
    }
    list.sort_by(|x, y| x.get("date").and_then(|v| v.as_str()).unwrap_or("").cmp(y.get("date").and_then(|v| v.as_str()).unwrap_or("")));
    let tmp = format!("{out}.tmp");
    if std::fs::write(&tmp, serde_json::to_string(&idx).unwrap()).and_then(|_| std::fs::rename(&tmp, out)).is_err() { eprintln!("écriture impossible"); std::process::exit(3) }
    println!("{}", serde_json::json!({"added": added, "present": present}));
    std::process::exit(0)
}
fn main() {
    let a: Vec<String> = std::env::args().collect();
    if a.len() >= 3 && a[1] == "index-merge" { index_merge(&a); }
    if a.len() < 2 || a[1] == "--help" || a[1] == "-h" { usage(); }
    if a[1] == "--version" { println!("rl-analyze {}", env!("CARGO_PKG_VERSION")); return; }
    let mut o = calc::Opts { me_names: vec![], me_epics: vec![], tz_offset_min: 0, debug: false };
    let (mut out, mut pretty) = (None, false);
    let mut i = 2;
    while i < a.len() {
        match a[i].as_str() {
            "--me-name" => { i += 1; o.me_names.push(a.get(i).cloned().unwrap_or_default()); }
            "--me-epic" => { i += 1; o.me_epics.push(a.get(i).cloned().unwrap_or_default()); }
            "--tz-offset-min" => { i += 1; o.tz_offset_min = a.get(i).and_then(|s| s.parse().ok()).unwrap_or(0); }
            "--out" => { i += 1; out = a.get(i).cloned(); }
            "--debug" => o.debug = true,
            "--pretty" => pretty = true,
            _ => usage(),
        }
        i += 1;
    }
    if o.me_names.is_empty() && o.me_epics.is_empty() { o.me_names.push("443Blood".into()); }
    let data = match std::fs::read(&a[1]) { Ok(d) => d, Err(e) => { eprintln!("lecture impossible : {e}"); std::process::exit(3) } };
    let res = std::panic::catch_unwind(|| ingest::load(&data));
    let m = match res { Ok(Ok(m)) => m, Ok(Err(e)) => { eprintln!("replay illisible : {e}"); std::process::exit(4) } Err(_) => { eprintln!("replay illisible (erreur interne)"); std::process::exit(4) } };
    let v = match calc::analyze(&m, &o) { Ok(v) => v, Err(e) => { eprintln!("analyse impossible : {e}"); std::process::exit(5) } };
    let s = if pretty { serde_json::to_string_pretty(&v).unwrap() } else { serde_json::to_string(&v).unwrap() };
    match out {
        Some(dir) => {
            std::fs::create_dir_all(&dir).ok();
            let id = v["id"].as_str().unwrap_or("replay").to_string();
            std::fs::File::create(format!("{dir}/{id}.json")).and_then(|mut f| f.write_all(s.as_bytes())).expect("écriture");
            // entrée d'index (compacte) : en-tête + stats + quelques séries légères pour les agrégats de l'onglet RL
            let mut idx = v.clone();
            if let Some(o) = idx.as_object_mut() {
                let d = o.remove("d").unwrap_or(serde_json::Value::Null);
                for k in ["heat", "heat_ball", "kick_stats", "periods", "team_stats"] { if let Some(x) = d.get(k) { o.insert(format!("d_{k}"), x.clone()); } }
                // versions compactes (tableaux) des listes d'événements, pour les agrégats sans charger chaque détail
                let g = |v: &serde_json::Value, k: &str| v.get(k).cloned().unwrap_or(serde_json::Value::Null);
                let list = |k: &str| d.get(k).and_then(|x| x.as_array()).cloned().unwrap_or_default();
                o.insert("d_shots".into(), serde_json::Value::Array(list("shots").iter().map(|s| serde_json::json!([g(s, "x"), g(s, "y"), g(s, "sp"), g(s, "on"), g(s, "air"), g(s, "o")])).collect()));
                o.insert("d_goals".into(), serde_json::Value::Array(list("goals").iter().map(|s| serde_json::json!([g(s, "for"), g(s, "by"), g(s, "type"), g(s, "speed"), g(s, "air"), g(s, "t")])).collect()));
                o.insert("d_kick".into(), serde_json::Value::Array(list("kickoffs").iter().map(|s| serde_json::json!([g(s, "spawn"), g(s, "role"), g(s, "first"), g(s, "out"), g(s, "react"), g(s, "flip")])).collect()));
                o.insert("d_after_goal".into(), serde_json::Value::Array(list("after_goal")));
            }
            std::fs::File::create(format!("{dir}/{id}.idx.json")).and_then(|mut f| f.write_all(serde_json::to_string(&idx).unwrap().as_bytes())).expect("écriture");
            println!("{id}");
        }
        None => println!("{s}"),
    }
}
