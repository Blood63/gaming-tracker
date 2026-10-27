#![allow(unused_variables, unused_assignments, unused_mut)]
//! Calcul des statistiques à partir des séries image par image (voir ingest.rs).
use crate::ingest::*;
use serde_json::{json, Map, Value};

pub struct Opts { pub me_names: Vec<String>, pub me_epics: Vec<String>, pub tz_offset_min: i32, pub debug: bool }

// seuils (ajustés par comparaison avec ballchasing, voir docs/validation)
pub struct Th { pub third: f32, pub slow: f32, pub boost_max: f32, pub ground_z: f32, pub high_z: f32, pub aerial_z: f32 }
pub const TH: Th = Th { third: 1706.67, slow: 1410.0, boost_max: 2200.0, ground_z: 20.0, high_z: 850.0, aerial_z: 300.0 };

const GOAL_Y: f32 = 5120.0;
const SMALL_PADS: [(f32, f32); 15] = [(0.0, -4240.0), (-1792.0, -4184.0), (1792.0, -4184.0), (-940.0, -3308.0), (940.0, -3308.0), (0.0, -2816.0), (-3584.0, -2484.0), (3584.0, -2484.0), (-1788.0, -2300.0), (1788.0, -2300.0), (-2048.0, -1036.0), (0.0, -1024.0), (2048.0, -1036.0), (-1024.0, 0.0), (1024.0, 0.0)];
const BIG_PADS: [(f32, f32); 6] = [(-3584.0, 0.0), (3584.0, 0.0), (-3072.0, 4096.0), (3072.0, 4096.0), (-3072.0, -4096.0), (3072.0, -4096.0)];

fn r1(x: f64) -> f64 { (x * 10.0).round() / 10.0 }
fn r2(x: f64) -> f64 { (x * 100.0).round() / 100.0 }
fn spd(v: [f32; 3]) -> f32 { (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt() }
fn dist(a: [f32; 3], b: [f32; 3]) -> f32 { spd([a[0] - b[0], a[1] - b[1], a[2] - b[2]]) }
fn pct(a: f64, b: f64) -> f64 { if b > 0.0 { 100.0 * a / b } else { 0.0 } }
fn near_pad(x: f32, y: f32) -> Option<(bool, f32)> {
    let mut best: Option<(bool, f32)> = None;
    for &(px, py) in BIG_PADS.iter() { let d = ((x - px).powi(2) + (y - py).powi(2)).sqrt(); if best.map_or(true, |b| d < b.1) { best = Some((true, d)); } }
    for &(px, py) in SMALL_PADS.iter() { for &(sx, sy) in &[(1.0f32, 1.0f32), (-1.0, 1.0), (1.0, -1.0), (-1.0, -1.0)] {
        let (qx, qy) = (px * sx, py * sy); let d = ((x - qx).powi(2) + (y - qy).powi(2)).sqrt(); if best.map_or(true, |b| d < b.1) { best = Some((false, d)); } } }
    best
}
fn near_pad_xy(x: f32, y: f32) -> Option<(bool, (f32, f32), f32)> {
    let mut best: Option<(bool, (f32, f32), f32)> = None;
    for &(px, py) in BIG_PADS.iter() { let d = ((x - px).powi(2) + (y - py).powi(2)).sqrt(); if best.map_or(true, |b| d < b.2) { best = Some((true, (px, py), d)); } }
    for &(px, py) in SMALL_PADS.iter() { for &(sx, sy) in &[(1.0f32, 1.0f32), (-1.0, 1.0), (1.0, -1.0), (-1.0, -1.0)] { let (qx, qy) = (px * sx, py * sy); let d = ((x - qx).powi(2) + (y - qy).powi(2)).sqrt(); if best.map_or(true, |b| d < b.2) { best = Some((false, (qx, qy), d)); } } }
    best
}
fn on_wall(p: [f32; 3]) -> bool { p[0].abs() > 3800.0 || (p[1].abs() > 4700.0 && p[0].abs() > 1200.0) || p[2] > 1900.0 }

struct Touch { f: usize, hf: usize, slot: usize, t: f32, bp: [f32; 3], bv_after: [f32; 3], bv_before: [f32; 3], cp: [f32; 3], cv: [f32; 3], tags: Vec<&'static str> }

pub fn find_me(m: &Match, o: &Opts) -> Option<usize> {
    for (i, p) in m.players.iter().enumerate() { if o.me_epics.iter().any(|e| !e.is_empty() && e.eq_ignore_ascii_case(&p.epic)) { return Some(i); } }
    for (i, p) in m.players.iter().enumerate() { if o.me_names.iter().any(|n| n.eq_ignore_ascii_case(&p.name)) { return Some(i); } }
    None
}

pub fn analyze(m: &Match, o: &Opts) -> Result<Value, String> {
    let me = find_me(m, o).ok_or("joueur introuvable dans ce replay")?;
    let team = m.players[me].team; let sgn: f32 = if team == 0 { 1.0 } else { -1.0 };
    let n = m.players.len();
    let mates: Vec<usize> = (0..n).filter(|&i| i != me && m.players[i].team == team).collect();
    let opps: Vec<usize> = (0..n).filter(|&i| m.players[i].team != team).collect();
    let nf = m.frames.len();
    if nf < 100 { return Err("replay trop court".into()); }
    let t0 = m.frames.iter().find(|f| f.st == 2).map(|f| f.t).unwrap_or(m.frames[0].t);
    let rel = |p: [f32; 3]| [p[0] * sgn, p[1] * sgn, p[2]];
    let relv = |p: [f32; 3]| [p[0] * sgn, p[1] * sgn, p[2]];
    // balle complétée (dernier état connu)
    let mut ball: Vec<Option<BallS>> = Vec::with_capacity(nf); let mut last = None;
    for f in &m.frames { if f.ball.is_some() { last = f.ball; } ball.push(last); }
    let live = |i: usize| m.frames[i].st == 2 || m.frames[i].st == 1; // jeu en cours (compte à rebours inclus)
    let secs = |i: usize| (m.frames[i].t - t0).max(0.0) as f64;

    // ---------- touches ----------
    let mut touches: Vec<Touch> = vec![];
    let has_touch_ctr = m.ctr.iter().any(|e| e.k == Ctr::BallTouches);
    for e in m.ctr.iter().filter(|e| e.k == Ctr::BallTouches) {
        let f = e.f.min(nf - 1);
        // image réelle du contact : plus gros changement de vitesse de balle autour du compteur
        let mut hf = f; let mut best = 0.0f32;
        for i in f.saturating_sub(3)..=(f + 3).min(nf - 2) { if let (Some(a), Some(b)) = (ball[i], ball[i + 1]) { let d = dist(a.v, b.v); if d > best { best = d; hf = i; } } }
        if best < 25.0 { hf = f; }
        let (b0, b1) = (ball[hf.saturating_sub(0)], ball[(hf + 1).min(nf - 1)]);
        if let (Some(b0), Some(b1)) = (b0, b1) {
            let c = m.frames[hf].cars[e.slot].or(m.frames[f].cars[e.slot]).unwrap_or_default();
            touches.push(Touch { f, hf, slot: e.slot, t: m.frames[hf].t, bp: b0.p, bv_after: b1.v, bv_before: b0.v, cp: c.p, cv: c.v, tags: vec![] });
        }
    }
    // étiquettes depuis les compteurs voisins
    let tagmap = [(Ctr::Shots, "shot"), (Ctr::Saves, "save"), (Ctr::Clears, "clear"), (Ctr::Centers, "center"), (Ctr::AerialHits, "aerial"), (Ctr::Goals, "goal"), (Ctr::Assists, "assist"), (Ctr::FirstTouches, "first"), (Ctr::BicycleHits, "bicycle"), (Ctr::FlipResets, "flipreset"), (Ctr::EpicSaves, "epic")];
    for t in touches.iter_mut() {
        for e in &m.ctr { if e.slot == t.slot && e.f + 8 >= t.f && e.f <= t.f + 8 { if let Some((_, nm)) = tagmap.iter().find(|(k, _)| *k == e.k) { if !t.tags.contains(nm) { t.tags.push(nm); } } } }
    }

    // ---------- durées / sommes de temps pour moi (définition ballchasing : toutes les images) ----------
    let mut tot = 0.0f64; let mut tot_live = 0.0f64;
    let (mut t_def3, mut t_neu3, mut t_off3, mut t_defh, mut t_offh, mut t_behind, mut t_front) = (0f64, 0f64, 0f64, 0f64, 0f64, 0f64, 0f64);
    let (mut t_sup, mut t_boostspd, mut t_slow, mut t_ground, mut t_low, mut t_high) = (0f64, 0f64, 0f64, 0f64, 0f64, 0f64);
    let (mut t_ps, mut n_ps, mut ps_on) = (0f64, 0u32, false); let mut ps_run = 0usize; let mut ps_lens = vec![0u32; 40]; let mut hs2 = vec![0f32; 100];
    let (mut sum_speed, mut dist_tot) = (0f64, 0f64); let (mut sp_act, mut t_act, mut sp_mov, mut t_mov, mut sp_nopg, mut t_nopg) = (0f64, 0f64, 0f64, 0f64, 0f64, 0f64);
    let (mut t_back, mut t_fwd, mut t_closest, mut t_farthest) = (0f64, 0f64, 0f64, 0f64);
    let (mut d_ball, mut d_ball_pos, mut t_pos, mut d_ball_nopos, mut t_nopos, mut d_mates, mut t_mates) = (0f64, 0f64, 0f64, 0f64, 0f64, 0f64, 0f64);
    let (mut b_sum, mut t_b0, mut t_b100) = (0f64, 0f64, 0f64); let (mut h_sum, mut h_b0, mut h_b100) = (0f64, 0f64, 0f64); let mut hq = [0f64; 4]; 
    let mut bb = [0f64; 4];
    let mut b_used = 0f64; let mut b_used_sup = 0f64;
    let mut role = [0f64; 3]; // 1er, 2e, 3e homme (distance à la balle)
    let mut prev_pos: Option<[f32; 3]> = None; let mut prev_boost: Option<f32> = None;
    // possession (dernier toucheur)
    let mut last_toucher: Option<usize> = None; let mut ti = 0usize; // touches triées par image
    let mut sorted: Vec<usize> = (0..touches.len()).collect(); sorted.sort_by_key(|&i| touches[i].f);
    let mut poss_team = [0f64; 2]; let mut poss_me = 0f64; let mut side_time = [0f64; 2];
    // histogrammes (pour la validation des seuils)
    let mut hz = vec![0f32; 215]; let mut hs = vec![0f32; 60]; let mut hy = vec![0f32; 170];
    let mut heat_me = vec![0f32; 16 * 20]; let mut heat_ball = vec![0f32; 16 * 20];
    let mut zero_on = false;
    for i in 0..nf {
        let fr = &m.frames[i]; let dt = fr.dt as f64;
        while ti < sorted.len() && touches[sorted[ti]].f <= i { last_toucher = Some(touches[sorted[ti]].slot); ti += 1; }
        let b = ball[i];
        if fr.st == 2 { if let Some(lt) = last_toucher { poss_team[m.players[lt].team as usize] += dt; if lt == me { poss_me += dt; } } }
        if let Some(b) = b { if fr.st == 2 { let br = rel(b.p); if br[1] > 0.0 { side_time[1] += dt; } else { side_time[0] += dt; } } }
        let c = match fr.cars[me] { Some(c) => c, None => { prev_pos = None; prev_boost = None; continue } };
        tot += dt; if fr.st != 3 { tot_live += dt; }
        let rp = rel(c.p); let sp = spd(c.v) as f64;
        // positionnement
        let ay = rp[1];
        if ay < -TH.third { t_def3 += dt } else if ay > TH.third { t_off3 += dt } else { t_neu3 += dt }
        if ay < 0.0 { t_defh += dt } else { t_offh += dt }
        if let Some(b) = b { let br = rel(b.p); if ay < br[1] { t_behind += dt } else { t_front += dt } }
        // vitesse
        sum_speed += sp * dt; if fr.st == 2 { sp_act += sp * dt; t_act += dt; } if fr.st != 3 { sp_nopg += sp * dt; t_nopg += dt; } if sp > 10.0 { sp_mov += sp * dt; t_mov += dt; } if sp >= 2200.0 { t_sup += dt } else if sp > TH.slow as f64 { t_boostspd += dt } else { t_slow += dt }
        if c.p[2] <= TH.ground_z { t_ground += dt } else if c.p[2] <= TH.high_z { t_low += dt } else { t_high += dt }
        if let Some(pp) = prev_pos { let d = dist(pp, c.p); if d < 400.0 { dist_tot += d as f64; } }
        prev_pos = Some(c.p);
        let ps_now = c.hb && c.p[2] <= 25.0; if ps_now { t_ps += dt; if !ps_on { n_ps += 1; } ps_run += 1; } else if ps_on { ps_lens[ps_run.min(39)] += 1; ps_run = 0; } ps_on = ps_now;
        hs2[(((sp - 1000.0) / 10.0).max(0.0) as usize).min(99)] += dt as f32;
        // boost
        b_sum += c.boost as f64 * dt; if c.boost < 1.0 { t_b0 += dt } if c.boost >= 99.0 { t_b100 += dt }
        let q = ((c.boost / 25.0) as usize).min(3); bb[q] += dt;
        h_sum += c.held as f64 * dt;  if c.held < 0.5 { h_b0 += dt } if c.held >= 99.5 { h_b100 += dt } hq[((c.held / 25.0) as usize).min(3)] += dt;
        if let Some(pb) = prev_boost { if fr.st == 2 && c.boost < pb && c.boost_on { let dd = (pb - c.boost) as f64; b_used += dd; if sp >= 2200.0 { b_used_sup += dd; } } } prev_boost = Some(c.boost);
        // classement équipe
        let mut mine: Vec<(usize, [f32; 3])> = vec![(me, c.p)];
        for &s in &mates { if let Some(x) = fr.cars[s] { mine.push((s, x.p)); } }
        if mine.len() == 1 { t_back += dt; t_fwd += dt; if b.is_some() { t_closest += dt; t_farthest += dt; } }
        if mine.len() > 1 {
            let ys: Vec<f32> = mine.iter().map(|(_, p)| rel(*p)[1]).collect();
            let mn = ys.iter().cloned().fold(f32::MAX, f32::min); let mx = ys.iter().cloned().fold(f32::MIN, f32::max);
            if (ay - mn).abs() < 0.01 { t_back += dt } if (ay - mx).abs() < 0.01 { t_fwd += dt }
            if let Some(b) = b {
                let ds: Vec<f32> = mine.iter().map(|(_, p)| dist(*p, b.p)).collect(); let my = ds[0];
                let rank = ds.iter().filter(|&&d| d < my).count(); if rank < 3 { role[rank] += dt; }
                if (my - ds.iter().cloned().fold(f32::MAX, f32::min)).abs() < 0.01 { t_closest += dt } if (my - ds.iter().cloned().fold(f32::MIN, f32::max)).abs() < 0.01 { t_farthest += dt }
            }
            let md: f64 = mine.iter().skip(1).map(|(_, p)| dist(c.p, *p) as f64).sum::<f64>() / (mine.len() - 1) as f64; d_mates += md * dt; t_mates += dt;
        }
        if let Some(b) = b { let d = dist(c.p, b.p) as f64; d_ball += d * dt;
            let mine_poss = last_toucher.map_or(false, |lt| m.players[lt].team == team);
            if mine_poss { d_ball_pos += d * dt; t_pos += dt } else { d_ball_nopos += d * dt; t_nopos += dt } }
        // histogrammes / cartes
        let zi = ((c.p[2].max(0.0) / 10.0) as usize).min(214); hz[zi] += dt as f32; hs[((sp / 50.0) as usize).min(59)] += dt as f32; hy[(((ay + 5200.0) / 64.0).max(0.0) as usize).min(169)] += dt as f32;
        if fr.st == 1 || fr.st == 2 { let xi = (((rp[0] + 4096.0) / 512.0).floor().max(0.0) as usize).min(15); let yi = (((rp[1] + 5120.0) / 512.0).floor().max(0.0) as usize).min(19); heat_me[yi * 16 + xi] += dt as f32;
            if let Some(b) = b { let br = rel(b.p); let xi = (((br[0] + 4096.0) / 512.0).floor().max(0.0) as usize).min(15); let yi = (((br[1] + 5120.0) / 512.0).floor().max(0.0) as usize).min(19); heat_ball[yi * 16 + xi] += dt as f32; } }
    }
    let _ = (relv,);
    let n_avg = |x: f64| if tot > 0.0 { x / tot } else { 0.0 };

    // ---------- compteurs bruts ----------
    let ctot = |slot: usize, k: Ctr| m.ctr.iter().filter(|e| e.slot == slot && e.k == k).map(|e| e.v).max().unwrap_or(0);
    let team_sum = |sl: &Vec<usize>, k: Ctr| -> i32 { sl.iter().map(|&s| ctot(s, k)).sum() };
    let mut mine_all = mates.clone(); mine_all.push(me);

    // ---------- boost : ramassages ----------
    let mut pads_me = vec![]; let (mut cb, mut cs, mut stb, mut sts, mut amt_b, mut amt_s, mut over, mut over_st, mut stolen_amt) = (0, 0, 0, 0, 0f64, 0f64, 0f64, 0f64, 0f64);
    let mut gained_cnt = [0i32; 2]; let mut gained_amt = 0f64; let mut free_pickups = 0;
    for p in m.pads.iter().filter(|p| p.slot == me) {
        let cpos = m.frames[p.f.min(nf - 1)].cars[me].map(|c| c.p).unwrap_or(p.p);
        let held_b = m.frames[p.f.saturating_sub(1)].cars[me].map(|c| c.held).unwrap_or(0.0) as f64;
        let held_a = m.frames[(p.f + 4).min(nf - 1)].cars[me].map(|c| c.held).unwrap_or(0.0) as f64;
        let np = near_pad_xy(cpos[0], cpos[1]);
        let gain = (held_a - held_b).max(0.0);
        let (big, (px, py), dpad) = match np { Some((b, xy, d)) if d < 700.0 => (b, xy, d), _ => (gain >= 30.0, (cpos[0], cpos[1]), 9999.0) };
        let _ = dpad;
        let rpy = py * sgn; let rpx = px * sgn;
        let nominal: f64 = if big { 100.0 } else { 12.16 };
        let counted = gain > 0.5; let of = (nominal - gain).max(0.0); let stolen = rpy > 100.0;
        if counted { gained_cnt[big as usize] += 1; gained_amt += gain; if big { cb += 1; amt_b += gain; if stolen { stb += 1; } } else { cs += 1; amt_s += gain; if stolen { sts += 1; } } if stolen { stolen_amt += gain; } } else { free_pickups += 1; }
        if counted { over += of; if stolen { over_st += of; } }
        pads_me.push(json!([r1(secs(p.f)), big as i32, stolen as i32, rpx.round(), rpy.round(), of.round(), counted as i32]));
    }
    let _ = (free_pickups, gained_cnt, gained_amt);
    let collected = amt_b + amt_s;
    let _ = (stolen_amt,);
    let active_min = (tot_live / 60.0).max(0.01);

    // ---------- coups de pied d'engagement ----------
    let mut kickoffs = vec![];
    {
        let mut i = 1usize;
        while i < nf {
            if m.frames[i].st == 2 && m.frames[i - 1].st == 1 {
                let fk = i; let tk = m.frames[fk].t;
                let spawn_f = fk.saturating_sub(1);
                let posn = |s: usize| m.frames[spawn_f].cars[s].map(|c| c.p);
                let bpos = ball[fk].map(|b| b.p).unwrap_or([0.0, 0.0, 93.0]);
                if let Some(mp) = posn(me) {
                    let mr = rel(mp);
                    let kind = if mr[0].abs() > 1500.0 { "diagonale" } else if mr[1] < -4300.0 { "centre" } else { "decale" };
                    // rôle : le plus proche de la balle dans l'équipe
                    let dm = dist(mp, bpos);
                    let closest = mates.iter().all(|&s| posn(s).map_or(true, |p| dist(p, bpos) >= dm - 1.0));
                    // réaction : 1re image où l'accélérateur est enfoncé ou la voiture bouge
                    let mut react = None;
                    for j in fk..(fk + 60).min(nf) { if let Some(c) = m.frames[j].cars[me] { if spd(c.v) > 500.0 { react = Some((m.frames[j].t - tk) as f64); break; } } }
                    // 1er contact (tous joueurs) après l'engagement
                    let ft = touches.iter().filter(|t| t.f >= fk && m.frames[t.f].t - tk < 8.0).min_by_key(|t| t.f);
                    let (first_t, first_mine, first_me, me_touch) = match ft {
                        Some(t) => (Some((m.frames[t.hf].t - tk) as f64), m.players[t.slot].team == team, t.slot == me, touches.iter().find(|x| x.slot == me && x.f >= fk && m.frames[x.f].t - tk < 6.0)),
                        None => (None, false, false, None) };
                    // issue : où est la balle 4 s après le contact ; but dans les 8 s ?
                    let tgt = tk + first_t.unwrap_or(0.0) as f32 + 4.0;
                    let mut yb = None; for j in fk..nf { if m.frames[j].t >= tgt { yb = ball[j].map(|b| rel(b.p)[1]); break; } }
                    let goal_soon = m.goals.iter().find(|g| g.f >= fk && m.frames[g.f.min(nf - 1)].t - tk < 9.0);
                    let outcome = if let Some(g) = goal_soon { if g.team == team { "but_pour" } else { "but_contre" } } else if first_t.is_none() { "inconnu" } else {
                        match yb { Some(y) if y > 600.0 => "gagne", Some(y) if y < -600.0 => "perdu", Some(_) => "neutre", None => "inconnu" } };
                    let dodge_before = m.ctr.iter().any(|e| e.slot == me && e.k == Ctr::Dodges && e.f >= fk && me_touch.map_or(false, |t| e.f <= t.f + 2) );
                    let spd_touch = me_touch.map(|t| spd(t.cv) as f64);
                    kickoffs.push(json!({"t": r1(secs(fk)), "spawn": kind, "role": if closest {"prend"} else {"suit"}, "react": react.map(r2), "first_t": first_t.map(r2),
                        "first": if first_t.is_none() {"aucun"} else if first_me {"moi"} else if first_mine {"equipe"} else {"adverse"}, "me_touch": me_touch.is_some(), "me_t": me_touch.map(|t| r2((m.frames[t.hf].t - tk) as f64)),
                        "speed": spd_touch.map(|x| x.round()), "flip": dodge_before, "out": outcome, "x": mr[0].round(), "y": mr[1].round()}));
                }
            }
            i += 1;
        }
    }

    // ---------- tirs, buts, parades ----------
    let sim_on_target = |p: [f32; 3], v: [f32; 3], toward: f32| -> bool {
        // projection balistique simple vers le but adverse (toward = +1/−1 en y absolu)
        if v[1] * toward <= 50.0 { return false; }
        let (mut x, mut y, mut z) = (p[0], p[1], p[2]); let (vx, vy, mut vz) = (v[0], v[1], v[2]); let dt = 1.0 / 60.0;
        for _ in 0..360 {
            x += vx * dt; y += vy * dt; z += vz * dt; vz -= 650.0 * dt; if z < 93.0 { z = 93.0; vz = vz.abs() * 0.6; }
            if y * toward >= GOAL_Y { return x.abs() < 893.0 && z < 643.0; }
            if x.abs() > 4096.0 { return false; }
        }
        false
    };
    let goal_by = |slot: usize| -> Vec<&GoalEv> { m.goals.iter().filter(|g| m.players[slot].name == g.name && m.players[slot].team == g.team).collect() };
    let _ = goal_by;
    let mut shots_me = vec![]; let mut shots_on = 0; let mut shots_goal = 0;
    let mut shot_speed_sum = 0f64; let mut shot_speed_max = 0f64;
    for e in m.ctr.iter().filter(|e| e.slot == me && e.k == Ctr::Shots) {
        let tc = touches.iter().filter(|t| t.slot == me && (t.f as i64 - e.f as i64).abs() <= 10).min_by_key(|t| (t.f as i64 - e.f as i64).abs());
        let hf = tc.map(|t| t.hf).unwrap_or(e.f.min(nf - 2));
        let (bp, bv) = match tc { Some(t) => (t.bp, t.bv_after), None => ball[hf].map(|b| (b.p, b.v)).unwrap_or(([0.0; 3], [0.0; 3])) };
        let speed = spd(bv) as f64; let brl = rel(bp);
        let tt = m.frames[hf].t;
        let goal = m.goals.iter().any(|g| g.team == team && g.name == m.players[me].name && m.frames[g.f.min(nf - 1)].t >= tt - 0.3 && m.frames[g.f.min(nf - 1)].t - tt < 4.0);
        let saved = m.ctr.iter().any(|c2| c2.k == Ctr::Saves && m.players[c2.slot].team != team && m.frames[c2.f.min(nf - 1)].t >= tt - 0.2 && m.frames[c2.f.min(nf - 1)].t - tt < 3.5);
        let on = goal || saved || sim_on_target(bp, bv, sgn);
        let outcome = if goal { "but" } else if saved { "arret" } else if on { "cadre" } else { "hors" };
        if on { shots_on += 1; } if goal { shots_goal += 1; } shot_speed_sum += speed; shot_speed_max = shot_speed_max.max(speed);
        let dg = dist(bp, [0.0, GOAL_Y * sgn, 320.0]) as f64;
        shots_me.push(json!({"t": r1(secs(hf)), "sp": speed.round(), "x": brl[0].round(), "y": brl[1].round(), "z": bp[2].round(), "d": dg.round(), "on": on as i32, "o": outcome, "air": (bp[2] > 350.0) as i32, "csp": tc.map(|t| spd(t.cv).round())}));
    }
    // buts (tous), avec rôle sans noms
    let mut goals_out = vec![]; let (mut gf, mut ga) = (0, 0);
    let mut ga_last_def = 0;
    for g in &m.goals {
        let gfr = g.f.min(nf - 1); let t = secs(gfr);
        let sc = m.players.iter().position(|p| p.name == g.name && p.team == g.team);
        let mine = g.team == team; if mine { gf += 1 } else { ga += 1 }
        let role = match sc { Some(s) if s == me => "moi", Some(s) if m.players[s].team == team => "equipier", Some(_) => "adverse", None => "?" };
        // dernier toucher de l'équipe qui marque
        let lt = touches.iter().filter(|x| x.f <= gfr + 2 && m.players[x.slot].team == g.team).max_by_key(|x| x.f);
        let mut bsp = 0f32; for j in gfr.saturating_sub(6)..=gfr { if let Some(b) = ball[j] { bsp = bsp.max(spd(b.v)); } }
        let assist = m.ctr.iter().any(|e| e.k == Ctr::Assists && m.players[e.slot].team == g.team && e.f + 20 >= gfr && e.f <= gfr + 40);
        let assist_me = m.ctr.iter().any(|e| e.k == Ctr::Assists && e.slot == me && e.f + 20 >= gfr && e.f <= gfr + 40);
        let (typ, dg, air) = match lt { Some(x) => { let br = if g.team == 0 { x.bp } else { [-x.bp[0], -x.bp[1], x.bp[2]] }; let d = dist(x.bp, [0.0, GOAL_Y * (if g.team == 0 { 1.0 } else { -1.0 }), 320.0]);
            let ty = if x.tags.contains(&"bicycle") { "ciseau" } else if x.bp[2] > 350.0 || x.cp[2] > 300.0 { "aerien" } else if d > 5200.0 { "longue_distance" } else if d < 1800.0 { "pres_du_but" } else if br[1] < 0.0 { "depuis_sa_moitie" } else { "au_sol" }; (ty, d as f64, x.bp[2] > 350.0) } None => ("?", 0.0, false) };
        // dernier défenseur (pour les buts encaissés)
        let mut last_def = false;
        if !mine { let mut ys = vec![]; for &s in &mine_all { if let Some(c) = m.frames[gfr].cars[s] { ys.push((s, rel(c.p)[1])); } } if let Some(&(s, _)) = ys.iter().min_by(|a, b| a.1.partial_cmp(&b.1).unwrap()) { if s == me { last_def = true; ga_last_def += 1; } } }
        goals_out.push(json!({"t": r1(t), "for": mine as i32, "by": role, "assist": assist as i32, "assist_me": assist_me as i32, "speed": (bsp as f64).round(), "type": typ, "dist": dg.round(), "air": air as i32, "last_def": last_def as i32,
            "ls": lt.map(|x| if x.slot == me { "moi" } else if m.players[x.slot].team == team { "equipier" } else { "adverse" })}));
    }
    let mut ld_var = vec![];
    for off in [0usize, 5, 10, 15, 20, 30, 45, 60, 90] { let mut n = 0; let mut n3 = 0;
        for g in m.goals.iter().filter(|g| g.team != team) { let gf = g.f.min(nf - 1).saturating_sub(off);
            let mut ys = vec![]; let mut ds = vec![]; for &s in &mine_all { if let Some(c) = m.frames[gf].cars[s] { ys.push((s, rel(c.p)[1])); ds.push((s, dist(c.p, [0.0, -GOAL_Y * sgn, 0.0]))); } }
            if let Some(&(s, _)) = ys.iter().min_by(|a, b| a.1.partial_cmp(&b.1).unwrap()) { if s == me { n += 1; } }
            if let Some(&(s, _)) = ds.iter().min_by(|a, b| a.1.partial_cmp(&b.1).unwrap()) { if s == me { n3 += 1; } } }
        ld_var.push(json!([off, n, n3])); }
    // parades / dégagements / centres (moi)
    let tag_list = |tag: &str| -> Vec<Value> { touches.iter().filter(|t| t.slot == me && t.tags.contains(&tag)).map(|t| { let b = rel(t.bp); json!({"t": r1(secs(t.hf)), "x": b[0].round(), "y": b[1].round(), "sp": spd(t.bv_after).round(), "z": t.bp[2].round()}) }).collect() };
    let saves_l = tag_list("save"); let clears_l = tag_list("clear"); let centers_l = tag_list("center");
    // ---------- aériens ----------
    let mut aer = vec![]; let mut aer_goal = 0; let mut aer_h = 0f64; let mut aer_max = 0f64;
    for t in touches.iter().filter(|t| t.slot == me) {
        if t.cp[2] >= TH.aerial_z && !on_wall(t.cp) && t.bp[2] >= 250.0 {
            let tt = m.frames[t.hf].t;
            let lead = m.goals.iter().any(|g| g.team == team && { let gt = m.frames[g.f.min(nf - 1)].t; gt >= tt && gt - tt < 4.0 }) && !touches.iter().any(|x| m.players[x.slot].team != team && x.f > t.f && m.frames[x.f].t - tt < 4.0 && m.goals.iter().any(|g| g.team == team && m.frames[g.f.min(nf - 1)].t >= m.frames[x.f].t));
            aer_h += t.cp[2] as f64; aer_max = aer_max.max(t.cp[2] as f64); if lead { aer_goal += 1; }
            let b = rel(t.bp); aer.push(json!({"t": r1(secs(t.hf)), "h": t.cp[2].round(), "bz": t.bp[2].round(), "x": b[0].round(), "y": b[1].round(), "sp": spd(t.bv_after).round(), "goal": lead as i32, "tags": t.tags}));
        }
    }
    // ---------- touches (moi) ----------
    let my_touches: Vec<&Touch> = touches.iter().filter(|t| t.slot == me).collect();
    let mut tdef = 0; let mut toff = 0; let mut tsum = 0f64; let mut tpow = 0f64;
    let mut touch_pts = vec![];
    for t in &my_touches { let b = rel(t.bp); if b[1] < 0.0 { tdef += 1 } else { toff += 1 } let sp_a = spd(t.bv_after) as f64; tsum += sp_a; tpow = tpow.max(sp_a);
        touch_pts.push(json!([r1(secs(t.hf)), b[0].round(), b[1].round(), b[2].round(), sp_a.round(), (spd(t.bv_after) - spd(t.bv_before)).round()])); }
    // ---------- démolitions ----------
    let mut demos_l = vec![]; let (d_in, d_out) = (ctot(me, Ctr::Demolishes), ctot(me, Ctr::TimesDemolished));
    {
        let mut used_att: Vec<usize> = vec![];
        for (ei, e) in m.ctr.iter().enumerate().filter(|(_, e)| e.k == Ctr::TimesDemolished) {
            let vic = e.slot;
            let att = m.ctr.iter().enumerate().find(|(ai, a)| a.k == Ctr::Demolishes && !used_att.contains(ai) && m.players[a.slot].team != m.players[vic].team && a.f + 10 >= e.f && a.f <= e.f + 90).map(|(ai, a)| (ai, a.slot));
            if let Some((ai, _)) = att { used_att.push(ai); }
            let att_slot = att.map(|x| x.1);
            let _ = ei;
            if att_slot != Some(me) && vic != me { continue; }
            let mut pos = [0.0f32; 3]; let mut j = e.f.saturating_sub(1); let mut tries = 0;
            loop { if let Some(c) = m.frames[j.min(nf - 1)].cars[vic] { pos = c.p; break; } if j == 0 || tries > 40 { break; } j -= 1; tries += 1; }
            let rp = rel(pos); let mine_att = att_slot == Some(me);
            let goal_after = m.goals.iter().any(|g| { let gt = m.frames[g.f.min(nf - 1)].t; let dt = m.frames[e.f.min(nf - 1)].t; gt >= dt && gt - dt < 6.0 && (g.team == team) == mine_att });
            demos_l.push(json!({"t": r1(secs(e.f)), "in": mine_att as i32, "x": rp[0].round(), "y": rp[1].round(), "goal": goal_after as i32}));
        }
    }
    // ---------- doubles engagements ----------
    let mut dbl = 0; let mut dbl_t = 0f64; let mut dbl_goal = 0;
    if !mates.is_empty() {
        let mut run = 0f64; let mut start = 0usize;
        for i in 0..nf { let fr = &m.frames[i]; let ok = (|| -> Option<bool> {
            if fr.st != 2 { return Some(false); } let b = ball[i]?; let c = fr.cars[me]?; 
            let dm = dist(c.p, b.p); if dm > 1000.0 { return Some(false); }
            let toward = |c: &Car| { let d = [b.p[0] - c.p[0], b.p[1] - c.p[1], b.p[2] - c.p[2]]; let l = spd(d).max(1.0); (c.v[0] * d[0] + c.v[1] * d[1] + c.v[2] * d[2]) / l };
            if toward(&c) < 400.0 { return Some(false); }
            for &s in &mates { if let Some(x) = fr.cars[s] { if dist(x.p, b.p) < 1000.0 && toward(&x) > 400.0 { return Some(true); } } } Some(false) })().unwrap_or(false);
            if ok { if run == 0.0 { start = i; } run += fr.dt as f64; } else { if run >= 0.4 { dbl += 1; dbl_t += run; let te = m.frames[i.min(nf - 1)].t; if m.goals.iter().any(|g| g.team != team && { let gt = m.frames[g.f.min(nf - 1)].t; gt >= m.frames[start].t && gt - te < 5.0 }) { dbl_goal += 1; } } run = 0.0; } }
    }
    // ---------- évolution : périodes de 60 s et séquences après but ----------
    let dur_live = tot_live;
    let np = ((dur_live / 60.0).ceil() as usize).max(1).min(15);
    let mut per: Vec<Map<String, Value>> = vec![];
    {
        // temps de jeu cumulé (hors replays) → période
        let mut acc = 0f64; let mut idxp = vec![0usize; nf];
        for i in 0..nf { if m.frames[i].st == 2 || m.frames[i].st == 1 { acc += m.frames[i].dt as f64; } idxp[i] = ((acc / 60.0) as usize).min(np - 1); }
        let mut tt = vec![0f64; np]; let mut sp_s = vec![0f64; np]; let mut sup = vec![0f64; np]; let mut bo = vec![0f64; np]; let mut dft = vec![0f64; np]; let mut bh = vec![0f64; np]; let mut chase = vec![0f64; np]; let mut poss = vec![0f64; np]; let mut pbn = vec![0f64; np];
        for i in 0..nf { let fr = &m.frames[i]; if !(fr.st == 1 || fr.st == 2) { continue; } let p = idxp[i]; let dt = fr.dt as f64;
            if let Some(b) = ball[i] { if fr.st == 2 { pbn[p] += dt; if rel(b.p)[1] > 0.0 { poss[p] += dt; } } }
            if let Some(c) = fr.cars[me] { tt[p] += dt; let s = spd(c.v) as f64; sp_s[p] += s * dt; if s >= 2200.0 { sup[p] += dt; } bo[p] += c.boost as f64 * dt; if rel(c.p)[1] < 0.0 { dft[p] += dt; } if let Some(b) = ball[i] { if rel(c.p)[1] < rel(b.p)[1] { bh[p] += dt; } } 
                let _ = &mut chase; } }
        let ev_in = |k: Ctr, p: usize, slots: &Vec<usize>| m.ctr.iter().filter(|e| e.k == k && slots.contains(&e.slot) && idxp[e.f.min(nf - 1)] == p).count();
        for p in 0..np {
            let mut mm = Map::new();
            mm.insert("n".into(), json!(p + 1)); mm.insert("sec".into(), json!(r1(tt[p])));
            mm.insert("speed".into(), json!(if tt[p] > 0.0 { (sp_s[p] / tt[p]).round() } else { 0.0 }));
            mm.insert("sup".into(), json!(r1(pct(sup[p], tt[p])))); mm.insert("boost".into(), json!(r1(if tt[p] > 0.0 { bo[p] / tt[p] } else { 0.0 })));
            mm.insert("def".into(), json!(r1(pct(dft[p], tt[p])))); mm.insert("behind".into(), json!(r1(pct(bh[p], tt[p]))));
            mm.insert("ball_opp".into(), json!(r1(pct(poss[p], pbn[p]))));
            mm.insert("touches".into(), json!(ev_in(Ctr::BallTouches, p, &vec![me]))); mm.insert("shots".into(), json!(ev_in(Ctr::Shots, p, &vec![me])));
            mm.insert("saves".into(), json!(ev_in(Ctr::Saves, p, &vec![me]))); mm.insert("pickups".into(), json!(m.pads.iter().filter(|x| x.slot == me && idxp[x.f.min(nf - 1)] == p).count()));
            mm.insert("gf".into(), json!(m.goals.iter().filter(|g| g.team == team && idxp[g.f.min(nf - 1)] == p).count())); mm.insert("ga".into(), json!(m.goals.iter().filter(|g| g.team != team && idxp[g.f.min(nf - 1)] == p).count()));
            per.push(mm);
        }
    }
    // avant / après un but : 30 s avant le but vs 30 s après la remise en jeu
    let window = |from: usize, to: usize| -> Value {
        let (mut t, mut s, mut su, mut bo, mut df, mut bh, mut n_t) = (0f64, 0f64, 0f64, 0f64, 0f64, 0f64, 0);
        for i in from..to.min(nf) { let fr = &m.frames[i]; if fr.st != 2 { continue; } if let Some(c) = fr.cars[me] { let dt = fr.dt as f64; t += dt; let sp = spd(c.v) as f64; s += sp * dt; if sp >= 2200.0 { su += dt; } bo += c.boost as f64 * dt; if rel(c.p)[1] < 0.0 { df += dt; } if let Some(b) = ball[i] { if rel(c.p)[1] < rel(b.p)[1] { bh += dt; } } } }
        for e in m.ctr.iter().filter(|e| e.slot == me && e.k == Ctr::BallTouches && e.f >= from && e.f < to) { let _ = e; n_t += 1; }
        if t < 5.0 { return Value::Null; }
        json!({"sec": r1(t), "speed": (s / t).round(), "sup": r1(pct(su, t)), "boost": r1(bo / t), "def": r1(pct(df, t)), "behind": r1(pct(bh, t)), "touches_min": r1(n_t as f64 * 60.0 / t)})
    };
    let mut after_goal = vec![];
    for (gi, g) in m.goals.iter().enumerate() {
        let gfr = g.f.min(nf - 1);
        // image de remise en jeu suivante
        let mut kf = gfr; while kf < nf && m.frames[kf].st != 2 { kf += 1; } if kf >= nf { continue; }
        let tg = m.frames[gfr].t; let tkf = m.frames[kf].t;
        let before = { let mut s = gfr; while s > 0 && tg - m.frames[s].t < 30.0 { s -= 1; } window(s, gfr) };
        let after = { let mut e = kf; while e < nf && m.frames[e].t - tkf < 30.0 { e += 1; } window(kf, e) };
        let next_goal = m.goals.get(gi + 1).map(|ng| (m.frames[ng.f.min(nf - 1)].t - tkf) as f64);
        after_goal.push(json!({"t": r1(secs(gfr)), "for": (g.team == team) as i32, "before": before, "after": after, "next_in": next_goal.map(r1), "next_for": m.goals.get(gi + 1).map(|ng| (ng.team == team) as i32)}));
    }
    // ---------- courbes (1 point / s) pour les graphiques interactifs ----------
    let mut tl_t = vec![]; let mut tl_sp = vec![]; let mut tl_b = vec![]; let mut tl_by = vec![]; let mut tl_my = vec![]; let mut tl_d = vec![]; let mut tl_poss = vec![];
    {
        let mut next = 0.0f64; let mut lt: Option<usize> = None; let mut ti2 = 0;
        for i in 0..nf { while ti2 < sorted.len() && touches[sorted[ti2]].f <= i { lt = Some(touches[sorted[ti2]].slot); ti2 += 1; }
            let fr = &m.frames[i]; if fr.st != 2 { continue; } let s = secs(i);
            if s >= next { next = s.floor() + 1.0;
                if let Some(c) = fr.cars[me] { tl_t.push(json!(s.round())); tl_sp.push(json!(spd(c.v).round())); tl_b.push(json!(c.boost.round())); tl_my.push(json!((rel(c.p)[1] / 10.0).round())); tl_d.push(json!(ball[i].map_or(0.0, |b| (dist(b.p, c.p) / 10.0).round())));
                    tl_by.push(json!(ball[i].map_or(0.0, |b| (rel(b.p)[1] / 10.0).round()))); tl_poss.push(json!(lt.map_or(0, |l| if m.players[l].team == team { 1 } else { -1 }))); } } }
    }
    let _ = (&heat_ball,);
    // ---------- résumé ----------
    let secs_total = tot;
    let score_me = if team == 0 { m.score[0] } else { m.score[1] }; let score_opp = if team == 0 { m.score[1] } else { m.score[0] };
    let (gf_hdr, ga_hdr) = (gf, ga);
    let shots_team = team_sum(&mine_all, Ctr::Shots); let shots_opp = team_sum(&opps, Ctr::Shots);
    let poss_tot = poss_team[0] + poss_team[1];
    let win = if m.props.get("WinningTeam").is_some() { m.props["WinningTeam"].parse::<u8>().ok() == Some(team) } else { score_me > score_opp };
    let ctot_me = |k: Ctr| ctot(me, k);
    let avg_b = n_avg(b_sum);
    let mut sm = Map::new();
    macro_rules! put { ($k:expr, $v:expr) => { sm.insert($k.to_string(), json!($v)); }; }
    put!("goals", ctot_me(Ctr::Goals)); put!("assists", ctot_me(Ctr::Assists)); put!("saves", ctot_me(Ctr::Saves)); put!("shots", ctot_me(Ctr::Shots)); put!("score", ctot_me(Ctr::Score));
    put!("shots_on", shots_on); put!("shots_goal", shots_goal); put!("shooting_pct", r1(pct(ctot_me(Ctr::Goals) as f64, ctot_me(Ctr::Shots) as f64)));
    put!("shots_against", shots_opp); put!("goals_against", ga_hdr); put!("clears", ctot_me(Ctr::Clears)); put!("centers", ctot_me(Ctr::Centers)); put!("aerial_hits", ctot_me(Ctr::AerialHits));
    put!("first_touches", ctot_me(Ctr::FirstTouches)); put!("epic_saves", ctot_me(Ctr::EpicSaves)); put!("bicycle", ctot_me(Ctr::BicycleHits)); put!("flip_resets", ctot_me(Ctr::FlipResets)); put!("dodges", ctot_me(Ctr::Dodges));
    put!("touches", my_touches.len()); put!("touches_pm", r1(my_touches.len() as f64 / active_min)); put!("touch_def_pct", r1(pct(tdef as f64, my_touches.len() as f64)));
    put!("touch_speed", if my_touches.is_empty() { 0.0 } else { (tsum / my_touches.len() as f64).round() }); put!("touch_power_max", tpow.round());
    put!("shot_speed_avg", if shots_me.is_empty() { 0.0 } else { (shot_speed_sum / shots_me.len() as f64).round() }); put!("shot_speed_max", shot_speed_max.round());
    put!("aerials", aer.len()); put!("aerial_goal", aer_goal); put!("aerial_h_avg", if aer.is_empty() { 0.0 } else { (aer_h / aer.len() as f64).round() }); put!("aerial_h_max", aer_max.round());
    put!("demos", d_in); put!("demos_taken", d_out); put!("demo_inflicted_ctr", ctot_me(Ctr::Demolishes)); put!("demo_taken_ctr", ctot_me(Ctr::TimesDemolished));
    put!("avg_boost", r1(avg_b)); put!("avg_boost_held", r1(n_avg(h_sum))); put!("pct_zero_boost_real", r1(pct(t_b0, tot))); put!("pct_full_boost_real", r1(pct(t_b100, tot))); put!("pct_zero_boost", r1(pct(h_b0, tot))); put!("pct_full_boost", r1(pct(h_b100, tot))); put!("boost_q", json!([r1(pct(hq[0], tot)), r1(pct(hq[1], tot)), r1(pct(hq[2], tot)), r1(pct(hq[3], tot))])); put!("bpm", r1(b_used / active_min)); put!("bcpm", r1(collected / active_min));
    put!("small_pads", cs); put!("big_pads", cb); put!("stolen", (amt_b * 0.0 + stolen_amt).round()); put!("stolen_big", stb); put!("stolen_small", sts); put!("overfill", over.round()); put!("overfill_pct", r1(pct(over, collected.max(1.0)))); put!("collected", collected.round()); put!("used", b_used.round()); put!("used_supersonic", b_used_sup.round());
    put!("pickups_ctr", ctot_me(Ctr::BoostPickups)); put!("pickups_free", free_pickups);
    put!("avg_speed", if t_mov > 0.0 { (sp_mov / t_mov).round() } else { 0.0 }); put!("avg_speed_all", n_avg(sum_speed).round()); put!("avg_speed_act", if t_act > 0.0 { (sp_act / t_act).round() } else { 0.0 });  put!("pct_supersonic", r1(pct(t_sup, tot))); put!("pct_boost_speed", r1(pct(t_boostspd, tot))); put!("pct_slow", r1(pct(t_slow, tot)));
    put!("pct_ground", r1(pct(t_ground, tot))); put!("pct_low_air", r1(pct(t_low, tot))); put!("pct_high_air", r1(pct(t_high, tot))); put!("powerslides", n_ps); put!("powerslide_s", r1(t_ps)); put!("distance", dist_tot.round());
    put!("pct_def_third", r1(pct(t_def3, tot))); put!("pct_neu_third", r1(pct(t_neu3, tot))); put!("pct_off_third", r1(pct(t_off3, tot))); put!("pct_def_half", r1(pct(t_defh, tot))); put!("pct_behind_ball", r1(pct(t_behind, tot)));
    put!("pct_most_back", r1(pct(t_back, tot))); put!("pct_most_forward", r1(pct(t_fwd, tot))); put!("pct_closest_ball", r1(pct(t_closest, tot))); put!("pct_farthest_ball", r1(pct(t_farthest, tot)));
    put!("dist_ball", if tot > 0.0 { (d_ball / tot).round() } else { 0.0 }); put!("dist_mates", if t_mates > 0.0 { (d_mates / t_mates).round() } else { 0.0 });
    put!("role1", r1(pct(role[0], tot))); put!("role2", r1(pct(role[1], tot))); put!("role3", r1(pct(role[2], tot)));
    put!("double_commits", dbl); put!("double_commit_s", r1(dbl_t)); put!("double_commit_goal", dbl_goal);
    put!("poss_team_pct", r1(pct(poss_team[team as usize], poss_tot))); put!("poss_me_pct", r1(pct(poss_me, poss_tot))); put!("ball_opp_half_pct", r1(pct(side_time[1], side_time[0] + side_time[1])));
    put!("goals_against_last_def", ga_last_def); put!("kickoffs", kickoffs.len());
    put!("kickoff_won", kickoffs.iter().filter(|k| matches!(k["out"].as_str(), Some("gagne") | Some("but_pour"))).count()); put!("kickoff_lost", kickoffs.iter().filter(|k| matches!(k["out"].as_str(), Some("perdu") | Some("but_contre"))).count());
    put!("kickoff_react", { let v: Vec<f64> = kickoffs.iter().filter_map(|k| k["react"].as_f64()).collect(); if v.is_empty() { Value::Null } else { json!(r2(v.iter().sum::<f64>() / v.len() as f64)) } });
    put!("kickoff_first_me", kickoffs.iter().filter(|k| k["first"] == "moi").count());
    put!("time_s", r1(secs_total)); put!("play_s", r1(tot_live));
    let _ = (gf_hdr, shots_team);
    let mut kick_stats = Map::new();
    for sp in ["diagonale", "decale", "centre"] { let a: Vec<&Value> = kickoffs.iter().filter(|k| k["spawn"] == sp).collect(); kick_stats.insert(sp.into(), json!({"n": a.len(), "won": a.iter().filter(|k| matches!(k["out"].as_str(), Some("gagne") | Some("but_pour"))).count(), "lost": a.iter().filter(|k| matches!(k["out"].as_str(), Some("perdu") | Some("but_contre"))).count()})); }

    let date_utc = parse_date(&m.date, o.tz_offset_min);
    let mut out = Map::new();
    out.insert("v".into(), json!(1)); out.insert("src".into(), json!("local"));
    out.insert("id".into(), json!(m.id)); out.insert("match_guid".into(), json!(m.props.get("MatchGUID")));
    out.insert("date".into(), json!(date_utc)); out.insert("date_local".into(), json!(m.date));
    out.insert("map".into(), json!(m.map)); out.insert("team_size".into(), json!(m.team_size));
    out.insert("match_type".into(), json!(m.props.get("MatchType"))); out.insert("playlist_id".into(), json!(if m.playlist >= 0 { Some(m.playlist) } else { None }));
    out.insert("duration".into(), json!(r1(secs_total))); out.insert("play".into(), json!(r1(tot_live)));
    out.insert("overtime".into(), json!(m.frames.iter().any(|f| f.st == 2 && false)));
    out.insert("team".into(), json!(team)); out.insert("team_goals".into(), json!(score_me)); out.insert("opp_goals".into(), json!(score_opp)); out.insert("result".into(), json!(if win { "win" } else { "loss" }));
    out.insert("forfeit".into(), json!(m.props.get("bForfeit").map_or(false, |s| s == "true")));
    out.insert("bots".into(), json!(m.players.iter().any(|p| p.bot)));
    out.insert("players".into(), json!(n));
    out.insert("s".into(), Value::Object(sm));
    let mut detail = Map::new();
    detail.insert("kickoffs".into(), json!(kickoffs)); detail.insert("kick_stats".into(), Value::Object(kick_stats));
    detail.insert("shots".into(), json!(shots_me)); detail.insert("goals".into(), json!(goals_out));
    detail.insert("saves".into(), json!(saves_l)); detail.insert("clears".into(), json!(clears_l)); detail.insert("centers".into(), json!(centers_l));
    detail.insert("aerials".into(), json!(aer)); detail.insert("touches".into(), json!(touch_pts)); detail.insert("demos".into(), json!(demos_l)); detail.insert("pads".into(), json!(pads_me));
    detail.insert("periods".into(), json!(per)); detail.insert("after_goal".into(), json!(after_goal));
    detail.insert("heat".into(), json!(heat_me.iter().map(|x| (x * 10.0).round() as i32).collect::<Vec<_>>()));
    detail.insert("heat_ball".into(), json!(heat_ball.iter().map(|x| (x * 10.0).round() as i32).collect::<Vec<_>>()));
    detail.insert("tl".into(), json!({"t": tl_t, "speed": tl_sp, "boost": tl_b, "y": tl_my, "dball": tl_d, "by": tl_by, "poss": tl_poss}));
    detail.insert("team_stats".into(), json!({"shots": shots_team, "shots_opp": shots_opp, "goals": gf_hdr, "goals_opp": ga_hdr,
        "poss": r1(pct(poss_team[team as usize], poss_tot)), "touches": m.ctr.iter().filter(|e| e.k == Ctr::BallTouches && m.players[e.slot].team == team).count(), "touches_opp": m.ctr.iter().filter(|e| e.k == Ctr::BallTouches && m.players[e.slot].team != team).count(),
        "saves": team_sum(&mine_all, Ctr::Saves), "demos": team_sum(&mine_all, Ctr::Demolishes), "clears": team_sum(&mine_all, Ctr::Clears), "centers": team_sum(&mine_all, Ctr::Centers),
        "score": team_sum(&mine_all, Ctr::Score), "score_opp": team_sum(&opps, Ctr::Score), "boost_pickups": team_sum(&mine_all, Ctr::BoostPickups)}));
    if o.debug { detail.insert("dbg".into(), json!({"hz": hz.iter().map(|x| (x * 100.0).round() / 100.0).collect::<Vec<_>>(), "hs": hs.iter().map(|x| (x * 100.0).round() / 100.0).collect::<Vec<_>>(), "hy": hy.iter().map(|x| (x * 100.0).round() / 100.0).collect::<Vec<_>>(), "has_touch_ctr": has_touch_ctr, "ps_lens": ps_lens, "hs2": hs2.iter().map(|x| (x * 100.0).round() / 100.0).collect::<Vec<_>>(), "ld_var": ld_var,
        "states": m.state_names.iter().collect::<Vec<_>>(), "pads_all": m.pads.len(), "touches_all": touches.len()})); }
    out.insert("d".into(), Value::Object(detail));
    Ok(Value::Object(out))
}

fn parse_date(d: &str, tz_min: i32) -> Option<String> {
    // "2026-10-14 19-20-18" (heure locale) → ISO UTC
    let p: Vec<i64> = d.split(|c| c == ' ' || c == '-' || c == ':').filter_map(|x| x.parse().ok()).collect();
    if p.len() < 6 { return None; }
    let days = days_from_civil(p[0], p[1], p[2]);
    let secs = days * 86400 + p[3] * 3600 + p[4] * 60 + p[5] - (tz_min as i64) * 60;
    let (dd, rem) = (secs.div_euclid(86400), secs.rem_euclid(86400));
    let (y, mo, da) = civil_from_days(dd);
    Some(format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, mo, da, rem / 3600, (rem % 3600) / 60, rem % 60))
}
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 { let y = if m <= 2 { y - 1 } else { y }; let era = y.div_euclid(400); let yoe = y - era * 400; let doy = (153 * (m + if m > 2 { -3 } else { 9 }) + 2) / 5 + d - 1; let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy; era * 146097 + doe - 719468 }
fn civil_from_days(z: i64) -> (i64, i64, i64) { let z = z + 719468; let era = z.div_euclid(146097); let doe = z - era * 146097; let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365; let y = yoe + era * 400; let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); let mp = (5 * doy + 2) / 153; let d = doy - (153 * mp + 2) / 5 + 1; let m = if mp < 10 { mp + 3 } else { mp - 9 }; (if m <= 2 { y + 1 } else { y }, m, d) }
