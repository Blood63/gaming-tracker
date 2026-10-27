// Tests d'intégration de rl-analyzer.
// - Les tests « erreurs » tournent toujours.
// - Les tests « replay » utilisent des fichiers .replay locaux (jamais publiés) :
//   dossier donné par RL_TEST_DIR (défaut ../rl-work/replays). Ignorés s'il n'existe pas.
use std::process::Command;
use std::path::PathBuf;

fn bin() -> Command { Command::new(env!("CARGO_BIN_EXE_rl-analyzer")) }
fn replay_dir() -> Option<PathBuf> {
    let d = std::env::var("RL_TEST_DIR").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("../rl-work/replays"));
    if d.is_dir() { Some(d) } else { None }
}
fn sha256(p: &std::path::Path) -> String {
    let o = Command::new("sha256sum").arg(p).output().expect("sha256sum");
    String::from_utf8_lossy(&o.stdout).split_whitespace().next().unwrap_or("").to_string()
}

#[test]
fn fichier_absent_code_3() {
    let o = bin().arg("/nonexistent/x.replay").output().unwrap();
    assert_eq!(o.status.code(), Some(3));
}
#[test]
fn fichier_corrompu_code_4() {
    let p = std::env::temp_dir().join("rl_garbage.replay");
    std::fs::write(&p, b"ceci n'est pas un replay").unwrap();
    let o = bin().arg(&p).output().unwrap();
    assert_eq!(o.status.code(), Some(4));
}
#[test]
fn sans_argument_code_2() {
    assert_eq!(bin().output().unwrap().status.code(), Some(2));
}
#[test]
fn version() {
    let o = bin().arg("x").arg("--version").output().unwrap();
    let _ = o; // --version n'est reconnu qu'en 1er argument
    let o = bin().arg("--version").output().unwrap();
    assert!(String::from_utf8_lossy(&o.stdout).starts_with("rl-analyze"));
}

fn run_json(p: &std::path::Path, extra: &[&str]) -> serde_json::Value {
    let o = bin().arg(p).args(extra).output().unwrap();
    assert!(o.status.success(), "échec: {}", String::from_utf8_lossy(&o.stderr));
    serde_json::from_slice(&o.stdout).unwrap()
}

#[test]
fn invariants_sur_replays_locaux() {
    let Some(d) = replay_dir() else { eprintln!("pas de replays locaux : test ignoré"); return };
    let mut n = 0;
    for e in std::fs::read_dir(d).unwrap().flatten().take(12) {
        let p = e.path(); if p.extension().map_or(true, |x| x != "replay") { continue; }
        let v = run_json(&p, &[]);
        let s = &v["s"];
        // thirds ≈ 100 %
        let t = s["pct_def_third"].as_f64().unwrap() + s["pct_neu_third"].as_f64().unwrap() + s["pct_off_third"].as_f64().unwrap();
        assert!((t - 100.0).abs() < 0.6, "tiers {t} ({:?})", p);
        // sol + bas + haut ≈ 100 %
        let a = s["pct_ground"].as_f64().unwrap() + s["pct_low_air"].as_f64().unwrap() + s["pct_high_air"].as_f64().unwrap();
        assert!((a - 100.0).abs() < 0.6, "air {a}");
        // le détail des tirs est cohérent avec le compteur
        assert_eq!(v["d"]["shots"].as_array().unwrap().len() as u64, s["shots"].as_u64().unwrap());
        // buts du joueur = buts listés pour moi
        assert!(s["goals"].as_u64().unwrap() <= v["team_goals"].as_u64().unwrap());
        // vie privée : un seul nom de joueur dans le JSON, jamais d'autre
        let txt = serde_json::to_string(&v).unwrap();
        assert!(!txt.contains("\"name\""), "clé name interdite");
        assert!(v["players"].is_number());
        n += 1;
    }
    assert!(n > 0);
}

#[test]
fn deterministe_et_valeurs_dorees() {
    let Some(d) = replay_dir() else { return };
    let gold: serde_json::Value = serde_json::from_str(include_str!("golden.json")).unwrap();
    let mut checked = 0;
    for e in std::fs::read_dir(d).unwrap().flatten() {
        let p = e.path(); if p.extension().map_or(true, |x| x != "replay") { continue; }
        let sha = sha256(&p);
        let Some(g) = gold.get(&sha) else { continue };
        let a = run_json(&p, &[]); let b = run_json(&p, &[]);
        assert_eq!(a, b, "non déterministe");
        assert_eq!(a["id"], g["id"]);
        for (k, want) in g["s"].as_object().unwrap() {
            assert_eq!(&a["s"][k], want, "clé {k} sur {}", g["id"]);
        }
        checked += 1;
    }
    if checked == 0 { eprintln!("aucun replay doré présent : ignoré"); }
}

#[test]
fn decalage_horaire_change_date_locale() {
    let Some(d) = replay_dir() else { return };
    let Some(e) = std::fs::read_dir(d).unwrap().flatten().find(|e| e.path().extension().map_or(false, |x| x == "replay")) else { return };
    let a = run_json(&e.path(), &["--tz-offset-min", "0"]);
    let b = run_json(&e.path(), &["--tz-offset-min", "120"]);
    assert_ne!(a["date"], b["date"]);
    assert_eq!(a["date_local"], b["date_local"]);
}

#[test]
fn nom_du_joueur_configurable() {
    let Some(d) = replay_dir() else { return };
    let Some(e) = std::fs::read_dir(d).unwrap().flatten().find(|e| e.path().extension().map_or(false, |x| x == "replay")) else { return };
    // un pseudo inexistant doit échouer proprement (code 5), jamais paniquer
    let o = bin().arg(e.path()).args(["--me-name", "PseudoQuiNExistePas"]).output().unwrap();
    assert_eq!(o.status.code(), Some(5));
}

#[test]
fn index_merge_ajoute_trie_et_dedoublonne() {
    let d = std::env::temp_dir().join("rl_idx_test"); let _ = std::fs::remove_dir_all(&d); std::fs::create_dir_all(&d).unwrap();
    let idx = d.join("idx.json"); let out = d.join("out.json");
    std::fs::write(&idx, r#"{"v":1,"replays":[{"id":"B","date":"2026-10-02T10:00:00Z"}]}"#).unwrap();
    let a = d.join("a.idx.json"); std::fs::write(&a, r#"{"id":"A","date":"2026-10-01T10:00:00Z"}"#).unwrap();
    let b = d.join("b.idx.json"); std::fs::write(&b, r#"{"id":"B","date":"2026-10-09T10:00:00Z","x":1}"#).unwrap();
    let o = bin().args(["index-merge"]).arg(&idx).arg(&a).arg(&b).arg("--out").arg(&out).output().unwrap();
    assert!(o.status.success());
    let r: serde_json::Value = serde_json::from_slice(&o.stdout).unwrap();
    assert_eq!(r["added"], serde_json::json!(["A"])); assert_eq!(r["present"], serde_json::json!(["B"]));
    let v: serde_json::Value = serde_json::from_slice(&std::fs::read(&out).unwrap()).unwrap();
    let ids: Vec<&str> = v["replays"].as_array().unwrap().iter().map(|x| x["id"].as_str().unwrap()).collect();
    assert_eq!(ids, vec!["A", "B"]);                                  // trié par date
    assert!(v["replays"][1].get("x").is_none());                      // l'existant n'est pas remplacé
    // index absent = vide ; index corrompu = code 6 et rien n'est écrit
    let o = bin().arg("index-merge").arg(d.join("nope.json")).arg(&a).arg("--out").arg(d.join("o2.json")).output().unwrap(); assert!(o.status.success());
    std::fs::write(d.join("bad.json"), "{bad").unwrap();
    let o = bin().arg("index-merge").arg(d.join("bad.json")).arg(&a).arg("--out").arg(d.join("o3.json")).output().unwrap();
    assert_eq!(o.status.code(), Some(6)); assert!(!d.join("o3.json").exists());
}

#[test]
fn entree_d_index_compacte_et_sans_noms() {
    let Some(d) = replay_dir() else { return };
    let Some(e) = std::fs::read_dir(d).unwrap().flatten().find(|e| e.path().extension().map_or(false, |x| x == "replay")) else { return };
    let out = std::env::temp_dir().join("rl_idx_entry_test"); let _ = std::fs::remove_dir_all(&out);
    let o = bin().arg(e.path()).arg("--out").arg(&out).output().unwrap(); assert!(o.status.success());
    let id = String::from_utf8_lossy(&o.stdout).trim().to_string();
    let txt = std::fs::read_to_string(out.join(format!("{id}.idx.json"))).unwrap();
    let v: serde_json::Value = serde_json::from_str(&txt).unwrap();
    for k in ["d_heat", "d_heat_ball", "d_kick_stats", "d_periods", "d_team_stats", "d_shots", "d_goals", "d_kick", "d_after_goal"] { assert!(v.get(k).is_some(), "manque {k}"); }
    assert_eq!(v["d_heat"].as_array().unwrap().len(), 320);
    assert!(v.get("d").is_none());                                     // pas de détail dans l'index
    assert!(!txt.contains("\"name\""));
    assert!(txt.len() < 12_000, "entrée d'index trop lourde : {}", txt.len());
}
