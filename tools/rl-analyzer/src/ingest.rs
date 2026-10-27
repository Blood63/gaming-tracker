//! Lecture d'un .replay (boxcars) et reconstruction des séries image par image : balle, voitures, boost, événements.
use boxcars::{Attribute, ParserBuilder, HeaderProp};
use std::collections::{BTreeMap, HashMap, HashSet};

pub const BOOST_PER_SEC: f32 = 100.0 / 3.0;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Ctr { Score, Goals, Assists, Saves, Shots, BallTouches, CarTouches, Centers, Clears, AerialHits, FirstTouches, EpicSaves, BicycleHits, FlipResets, Demolishes, TimesDemolished, SelfDemo, BoostPickups, Dodges }
pub const CTRS: [Ctr; 19] = [Ctr::Score, Ctr::Goals, Ctr::Assists, Ctr::Saves, Ctr::Shots, Ctr::BallTouches, Ctr::CarTouches, Ctr::Centers, Ctr::Clears, Ctr::AerialHits, Ctr::FirstTouches, Ctr::EpicSaves, Ctr::BicycleHits, Ctr::FlipResets, Ctr::Demolishes, Ctr::TimesDemolished, Ctr::SelfDemo, Ctr::BoostPickups, Ctr::Dodges];

#[derive(Clone, Copy, Debug, PartialEq)]
enum A { Rb, Pawn, PriName, PriId, PriTeam, PriEpic, PriUnique, Counter(Ctr), CompVehicle, Boost, Active, Throttle, Steer, Handbrake, Driving, Pickup, PickupOld, State, BallHit, ReplayFlag, DemoExt, Demo, TeamPaint, TotalTime, Playlist, Other }
#[derive(Clone, Copy, Debug, PartialEq)]
enum K { Ball, Car, Pri, Team(u8), Boost, Jump, Dodge, DoubleJump, Pad, GameEvent, Other }

fn attr_kind(n: &str) -> A {
    match n {
        "TAGame.RBActor_TA:ReplicatedRBState" => A::Rb,
        "Engine.Pawn:PlayerReplicationInfo" => A::Pawn,
        "Engine.PlayerReplicationInfo:PlayerName" => A::PriName,
        "Engine.PlayerReplicationInfo:PlayerID" => A::PriId,
        "Engine.PlayerReplicationInfo:Team" => A::PriTeam,
        "TAGame.PRI_TA:EpicPUID" => A::PriEpic,
        "Engine.PlayerReplicationInfo:UniqueId" => A::PriUnique,
        "TAGame.PRI_TA:MatchScore" => A::Counter(Ctr::Score),
        "TAGame.PRI_TA:MatchGoals" => A::Counter(Ctr::Goals),
        "TAGame.PRI_TA:MatchAssists" => A::Counter(Ctr::Assists),
        "TAGame.PRI_TA:MatchSaves" => A::Counter(Ctr::Saves),
        "TAGame.PRI_TA:MatchShots" => A::Counter(Ctr::Shots),
        "TAGame.PRI_TA:BallTouches" => A::Counter(Ctr::BallTouches),
        "TAGame.PRI_TA:CarTouches" => A::Counter(Ctr::CarTouches),
        "TAGame.PRI_TA:MatchCenters" => A::Counter(Ctr::Centers),
        "TAGame.PRI_TA:MatchClears" => A::Counter(Ctr::Clears),
        "TAGame.PRI_TA:MatchAerialHits" => A::Counter(Ctr::AerialHits),
        "TAGame.PRI_TA:MatchFirstTouches" => A::Counter(Ctr::FirstTouches),
        "TAGame.PRI_TA:MatchEpicSaves" => A::Counter(Ctr::EpicSaves),
        "TAGame.PRI_TA:MatchBicycleHits" => A::Counter(Ctr::BicycleHits),
        "TAGame.PRI_TA:MatchFlipResets" => A::Counter(Ctr::FlipResets),
        "TAGame.PRI_TA:MatchDemolishes" => A::Counter(Ctr::Demolishes),
        "TAGame.PRI_TA:MatchTimesDemolished" => A::Counter(Ctr::TimesDemolished),
        "TAGame.PRI_TA:SelfDemolitions" => A::Counter(Ctr::SelfDemo),
        "TAGame.PRI_TA:BoostPickups" => A::Counter(Ctr::BoostPickups),
        "TAGame.PRI_TA:Dodges" => A::Counter(Ctr::Dodges),
        "TAGame.CarComponent_TA:Vehicle" => A::CompVehicle,
        "TAGame.CarComponent_Boost_TA:ReplicatedBoost" => A::Boost,
        "TAGame.CarComponent_TA:ReplicatedActive" => A::Active,
        "TAGame.Vehicle_TA:ReplicatedThrottle" => A::Throttle,
        "TAGame.Vehicle_TA:ReplicatedSteer" => A::Steer,
        "TAGame.Vehicle_TA:bReplicatedHandbrake" => A::Handbrake,
        "TAGame.Vehicle_TA:bDriving" => A::Driving,
        "TAGame.VehiclePickup_TA:NewReplicatedPickupData" => A::Pickup,
        "TAGame.VehiclePickup_TA:ReplicatedPickupData" => A::PickupOld,
        "TAGame.GameEvent_TA:ReplicatedStateName" => A::State,
        "TAGame.GameEvent_Soccar_TA:bBallHasBeenHit" => A::BallHit,
        "TAGame.RBActor_TA:bReplayActor" => A::ReplayFlag,
        "TAGame.Car_TA:ReplicatedDemolishExtended" => A::DemoExt,
        "TAGame.Car_TA:ReplicatedDemolish" => A::Demo,
        "TAGame.Car_TA:TeamPaint" => A::TeamPaint,
        "TAGame.PRI_TA:TotalGameTimePlayed" => A::TotalTime,
        "ProjectX.GRI_X:ReplicatedGamePlaylist" => A::Playlist,
        _ => A::Other,
    }
}

fn class_kind(n: &str) -> K {
    if n.starts_with("Archetypes.Ball.") { return K::Ball; }
    match n {
        "Archetypes.Car.Car_Default" => K::Car,
        "TAGame.Default__PRI_TA" => K::Pri,
        "Archetypes.Teams.Team0" => K::Team(0),
        "Archetypes.Teams.Team1" => K::Team(1),
        "Archetypes.CarComponents.CarComponent_Boost" => K::Boost,
        "Archetypes.CarComponents.CarComponent_Jump" => K::Jump,
        "Archetypes.CarComponents.CarComponent_Dodge" => K::Dodge,
        "Archetypes.CarComponents.CarComponent_DoubleJump" => K::DoubleJump,
        _ => if n.contains("VehiclePickup_Boost_TA") { K::Pad } else if n.starts_with("Archetypes.GameEvent.") { K::GameEvent } else { K::Other },
    }
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Car { pub p: [f32; 3], pub v: [f32; 3], pub q: [f32; 4], pub boost: f32, pub held: f32, pub boost_on: bool, pub hb: bool, pub thr: u8, pub steer: u8, pub moving: bool }
#[derive(Clone, Copy, Debug, Default)]
pub struct BallS { pub p: [f32; 3], pub v: [f32; 3] }
#[derive(Clone, Debug)]
pub struct Frm { pub t: f32, pub dt: f32, pub st: u8, pub ball: Option<BallS>, pub cars: Vec<Option<Car>>, pub hit: bool }
#[derive(Clone, Debug, Default)]
pub struct Pl { pub key: i32, pub name: String, pub epic: String, pub team: u8, pub bot: bool }
#[derive(Clone, Debug)]
pub struct CtrEv { pub f: usize, pub slot: usize, pub k: Ctr, pub v: i32 }
#[derive(Clone, Debug)]
pub struct PadEv { pub f: usize, pub slot: usize, pub pad: i32, pub p: [f32; 3] }
#[derive(Clone, Debug)]
pub struct DemoEv { pub f: usize, pub att: Option<usize>, pub vic: Option<usize>, pub pos: [f32; 3] }
#[derive(Clone, Debug)]
pub struct GoalEv { pub f: usize, pub name: String, pub team: u8 }
pub struct Match { pub playlist: i32,
    pub frames: Vec<Frm>, pub players: Vec<Pl>, pub ctr: Vec<CtrEv>, pub pads: Vec<PadEv>, pub demos: Vec<DemoEv>, pub goals: Vec<GoalEv>,
    pub props: HashMap<String, String>, pub team_size: i32, pub state_names: HashSet<String>, pub map: String, pub date: String, pub id: String,
    pub score: [i32; 2], pub overtime_hint: bool,
}

fn prop_str(p: &HeaderProp) -> String { match p { HeaderProp::Str(s) | HeaderProp::Name(s) => s.clone(), HeaderProp::Int(i) => i.to_string(), HeaderProp::Float(f) => f.to_string(), HeaderProp::QWord(q) => q.to_string(), HeaderProp::Bool(b) => b.to_string(), HeaderProp::Byte { value, .. } => value.clone().unwrap_or_default(), _ => String::new() } }
fn prop_int(p: &HeaderProp) -> Option<i64> { match p { HeaderProp::Int(i) => Some(*i as i64), HeaderProp::QWord(q) => Some(*q as i64), HeaderProp::Float(f) => Some(*f as i64), HeaderProp::Byte { .. } => None, _ => None } }

struct ActorInfo { kind: K, name: String, replay: bool, obj: usize }
#[derive(Default)]
struct PriSt { pgen: usize, key: Option<i32>, name: String, epic: String, team_actor: i32, team: Option<u8>, slot: Option<usize>, ctr: HashMap<usize, i32> }
#[derive(Default, Clone, Copy)]
struct RbSt { p: [f32; 3], v: [f32; 3], q: [f32; 4], has: bool, moving: bool }
#[derive(Default)]
struct CompSt { car: i32, held: f32, amount: f32, active: bool, got: bool }

pub fn load(data: &[u8]) -> Result<Match, String> {
    GEN_SLOT.with(|g| g.borrow_mut().clear());
    let r = ParserBuilder::new(data).must_parse_network_data().parse().map_err(|e| format!("parse: {e}"))?;
    let nf = r.network_frames.as_ref().ok_or("pas de données réseau")?;
    let objk: Vec<(K, A)> = r.objects.iter().map(|n| (class_kind(n), attr_kind(n))).collect();
    let mut props = HashMap::new();
    for (k, v) in &r.properties { props.insert(k.clone(), prop_str(v)); }
    let team_size = r.properties.iter().find(|(k, _)| k == "TeamSize").and_then(|(_, v)| prop_int(v)).unwrap_or(0) as i32;
    let mut goals = vec![];
    if let Some((_, HeaderProp::Array(a))) = r.properties.iter().find(|(k, _)| k == "Goals") {
        for g in a { let mut f = 0usize; let mut n = String::new(); let mut t = 0u8;
            for (k, v) in g { match k.as_str() { "frame" => f = prop_int(v).unwrap_or(0) as usize, "PlayerName" => n = prop_str(v), "PlayerTeam" => t = prop_int(v).unwrap_or(0) as u8, _ => {} } }
            goals.push(GoalEv { f, name: n, team: t }); }
    }
    let score = [props.get("Team0Score").and_then(|s| s.parse().ok()).unwrap_or(0), props.get("Team1Score").and_then(|s| s.parse().ok()).unwrap_or(0)];

    let mut actors: BTreeMap<i32, ActorInfo> = BTreeMap::new();
    let mut pri: HashMap<i32, PriSt> = HashMap::new();
    let mut rb: HashMap<i32, RbSt> = HashMap::new();
    let mut car_pri: HashMap<i32, i32> = HashMap::new();
    let mut car_team_paint: HashMap<i32, u8> = HashMap::new();
    let mut comps: HashMap<i32, CompSt> = HashMap::new();
    let mut car_comp: HashMap<i32, i32> = HashMap::new();
    let mut hb: HashMap<i32, bool> = HashMap::new();
    let mut thr: HashMap<i32, u8> = HashMap::new();
    let mut steer: HashMap<i32, u8> = HashMap::new();
    let mut slot_of_key: HashMap<i32, usize> = HashMap::new();
    let mut players: Vec<Pl> = vec![];
    let mut team_actor_num: HashMap<i32, u8> = HashMap::new();
    let mut ball_actor: Option<i32> = None;
    let mut state = 0u8; let mut state_names = HashSet::new(); let mut hit = false; let mut playlist = -1i32;
    let mut frames: Vec<Frm> = Vec::with_capacity(nf.frames.len());
    let mut ctr: Vec<CtrEv> = vec![]; let mut pads: Vec<PadEv> = vec![]; let mut demos: Vec<DemoEv> = vec![];
    let mut last_demo: HashMap<i32, f32> = HashMap::new();
    let mut gen_n = 0usize; let mut raw_ctr: Vec<(usize, usize, usize, i32)> = vec![]; let mut gen_slot: HashMap<usize, usize> = HashMap::new();
    let mut pad_ids: HashMap<i32, i32> = HashMap::new(); let mut pad_last: HashMap<i32, u8> = HashMap::new();

    for (fi, f) in nf.frames.iter().enumerate() {
        for d in &f.deleted_actors {
            let id = d.0;
            if let Some(a) = actors.remove(&id) { if a.kind == K::Ball && ball_actor == Some(id) { ball_actor = None; } }
            rb.remove(&id); car_pri.remove(&id); car_comp.remove(&id); comps.remove(&id); pri.remove(&id); hb.remove(&id); thr.remove(&id); steer.remove(&id);
        }
        for a in &f.new_actors {
            let oi = a.object_id.0 as usize; let k = objk.get(oi).map(|x| x.0).unwrap_or(K::Other);
            let name = a.name_id.and_then(|n| r.names.get(n as usize)).cloned().unwrap_or_default();
            let again = actors.get(&a.actor_id.0).map_or(false, |x| x.obj == oi); // image clé : l'acteur existe déjà, on garde son état
            let was_replay = actors.get(&a.actor_id.0).map_or(false, |x| x.replay);
            actors.insert(a.actor_id.0, ActorInfo { kind: k, name, replay: if again { was_replay } else { false }, obj: oi });
            if again { continue; }
            match k {
                K::Ball => { ball_actor = Some(a.actor_id.0); }
                K::Pri => { gen_n += 1; pri.insert(a.actor_id.0, PriSt { pgen: gen_n, ..Default::default() }); }
                K::Team(n) => { team_actor_num.insert(a.actor_id.0, n); }
                K::Boost => { comps.insert(a.actor_id.0, CompSt::default()); }
                K::Pad => { let n = pad_ids.len() as i32; pad_ids.entry(a.actor_id.0).or_insert(n); }
                _ => {}
            }
            if matches!(k, K::Ball | K::Car) {
                let mut s = RbSt::default();
                { let t = &a.initial_trajectory; if let Some(l) = &t.location { s.p = [l.x as f32, l.y as f32, l.z as f32]; s.has = true; s.q = [0.0, 0.0, 0.0, 1.0]; } }
                rb.insert(a.actor_id.0, s);
            }
        }
        // temps : l'état des compteurs de boost avance au prorata du temps si le turbo est actif
        let dt = f.delta.clamp(0.0, 0.25);
        for (_, c) in comps.iter_mut() { if c.active && c.got { c.amount = (c.amount - BOOST_PER_SEC * dt).max(0.0); } }

        for u in &f.updated_actors {
            let aid = u.actor_id.0; let oi = u.object_id.0 as usize;
            let ak = match objk.get(oi) { Some(x) => x.1, None => continue };
            if ak == A::Other { continue; }
            match (ak, &u.attribute) {
                (A::Rb, Attribute::RigidBody(b)) => {
                    let e = rb.entry(aid).or_default();
                    e.p = [b.location.x, b.location.y, b.location.z]; e.has = true;
                    e.q = [b.rotation.x, b.rotation.y, b.rotation.z, b.rotation.w];
                    if let Some(v) = b.linear_velocity { e.v = [v.x, v.y, v.z]; } else { e.v = [0.0; 3]; }
                    e.moving = !b.sleeping;
                }
                (A::ReplayFlag, Attribute::Boolean(b)) => { if let Some(a) = actors.get_mut(&aid) { a.replay = *b; } }
                (A::Pawn, Attribute::ActiveActor(x)) => { if x.active { car_pri.insert(aid, x.actor.0); } else { car_pri.remove(&aid); } }
                (A::PriName, Attribute::String(s)) => { pri.entry(aid).or_default().name = s.clone(); }
                (A::PriId, Attribute::Int(i)) => { pri.entry(aid).or_default().key = Some(*i); }
                (A::PriTeam, Attribute::ActiveActor(x)) => { let p = pri.entry(aid).or_default(); p.team_actor = x.actor.0; p.team = team_actor_num.get(&x.actor.0).copied(); }
                (A::PriEpic, Attribute::String(s)) => { pri.entry(aid).or_default().epic = s.clone(); }
                (A::PriUnique, Attribute::UniqueId(uid)) => { if let boxcars::RemoteId::Epic(e) = &uid.remote_id { let p = pri.entry(aid).or_default(); if p.epic.is_empty() { p.epic = e.clone(); } } }
                (A::Counter(c), Attribute::Int(v)) => {
                    let p = pri.entry(aid).or_default(); p.ctr.insert(c as usize, *v);
                    raw_ctr.push((fi, p.pgen, c as usize, *v));
                }
                (A::CompVehicle, Attribute::ActiveActor(x)) => { if let Some(c) = comps.get_mut(&aid) { c.car = x.actor.0; if x.active { car_comp.insert(x.actor.0, aid); } } }
                (A::Boost, Attribute::ReplicatedBoost(b)) => { let c = comps.entry(aid).or_default(); c.amount = b.boost_amount as f32 * 100.0 / 255.0; c.held = c.amount; c.got = true; }
                (A::Active, Attribute::Byte(b)) => { if let Some(c) = comps.get_mut(&aid) { c.active = b & 1 == 1; } }
                (A::Throttle, Attribute::Byte(b)) => { thr.insert(aid, *b); }
                (A::Steer, Attribute::Byte(b)) => { steer.insert(aid, *b); }
                (A::Handbrake, Attribute::Boolean(b)) => { hb.insert(aid, *b); }
                (A::Playlist, Attribute::Int(i)) => { playlist = *i; }
                (A::State, Attribute::Int(i)) => {
                    let n = r.names.get(*i as usize).cloned().unwrap_or_default(); state_names.insert(n.clone());
                    state = match n.as_str() { "Countdown" => 1, "Active" => 2, "PostGoalScored" => 3, "Replay" | "PostReplay" => 4, "GameOver" | "PostGameEnd" | "Finished" => 5, _ => 0 };
                }
                (A::BallHit, Attribute::Boolean(b)) => { hit = *b; }
                (A::TeamPaint, Attribute::TeamPaint(t)) => { car_team_paint.insert(aid, t.team); }
                (A::Pickup, Attribute::PickupNew(p)) => {
                    let fresh = pad_last.insert(aid, p.picked_up) != Some(p.picked_up); if p.picked_up != 255 && fresh { if let Some(ic) = p.instigator { let pos = rb.get(&ic.0).map(|s| s.p).unwrap_or([0.0; 3]);
                        let slot = car_pri.get(&ic.0).copied().and_then(|pr| slot_for(&mut pri, &mut players, &mut slot_of_key, &team_actor_num, pr));
                        if let Some(slot) = slot { let pid = pad_ids.get(&aid).copied().unwrap_or(-1); pads.push(PadEv { f: fi, slot, pad: pid, p: pos }); } } }
                }
                (A::PickupOld, Attribute::Pickup(p)) => {
                    if p.picked_up { if let Some(ic) = p.instigator { let pos = rb.get(&ic.0).map(|s| s.p).unwrap_or([0.0; 3]);
                        let slot = car_pri.get(&ic.0).copied().and_then(|pr| slot_for(&mut pri, &mut players, &mut slot_of_key, &team_actor_num, pr));
                        if let Some(slot) = slot { let pid = pad_ids.get(&aid).copied().unwrap_or(-1); pads.push(PadEv { f: fi, slot, pad: pid, p: pos }); } } }
                }
                (A::DemoExt, Attribute::DemolishExtended(d)) => {
                    let vic = d.victim.actor.0;
                    let t = f.time;
                    if last_demo.get(&vic).map_or(true, |lt| t - lt > 2.5) && d.victim.active {
                        last_demo.insert(vic, t);
                        let vs = car_pri.get(&vic).copied().and_then(|pr| slot_for(&mut pri, &mut players, &mut slot_of_key, &team_actor_num, pr));
                        let at = if d.attacker_pri.active { slot_for(&mut pri, &mut players, &mut slot_of_key, &team_actor_num, d.attacker_pri.actor.0) } else { None };
                        let pos = rb.get(&vic).map(|s| s.p).unwrap_or([0.0; 3]);
                        demos.push(DemoEv { f: fi, att: at, vic: vs, pos });
                    }
                }
                (A::Demo, Attribute::Demolish(d)) => {
                    let vic = d.victim.0; let t = f.time;
                    if last_demo.get(&vic).map_or(true, |lt| t - lt > 2.5) {
                        last_demo.insert(vic, t);
                        let vs = car_pri.get(&vic).copied().and_then(|pr| slot_for(&mut pri, &mut players, &mut slot_of_key, &team_actor_num, pr));
                        let at = car_pri.get(&d.attacker.0).copied().and_then(|pr| slot_for(&mut pri, &mut players, &mut slot_of_key, &team_actor_num, pr));
                        let pos = rb.get(&vic).map(|s| s.p).unwrap_or([0.0; 3]);
                        demos.push(DemoEv { f: fi, att: at, vic: vs, pos });
                    }
                }
                _ => {}
            }
        }
        // photo de l'image
        let ball = ball_actor.and_then(|b| rb.get(&b).filter(|s| s.has).map(|s| BallS { p: s.p, v: s.v }))
            .filter(|_| !ball_actor.and_then(|b| actors.get(&b)).map_or(false, |a| a.replay));
        let mut cars: Vec<Option<Car>> = vec![None; players.len()];
        for (cid, info) in actors.iter() {
            if info.kind != K::Car || info.replay { continue; }
            let prid = match car_pri.get(cid) { Some(p) => *p, None => continue };
            let slot = match slot_for(&mut pri, &mut players, &mut slot_of_key, &team_actor_num, prid) { Some(s) => s, None => continue };
            if let Some(tp) = car_team_paint.get(cid) { if players[slot].team == 255 { players[slot].team = *tp; } }
            let s = match rb.get(cid) { Some(s) if s.has => s, _ => continue };
            if cars.len() <= slot { cars.resize(slot + 1, None); }
            let (boost, held, on) = car_comp.get(cid).and_then(|c| comps.get(c)).map(|c| (c.amount, if c.got { c.held } else { 33.3 }, c.active)).unwrap_or((33.3, 33.3, false));
            cars[slot] = Some(Car { p: s.p, v: s.v, q: s.q, boost, held, boost_on: on, hb: hb.get(cid).copied().unwrap_or(false), thr: thr.get(cid).copied().unwrap_or(128), steer: steer.get(cid).copied().unwrap_or(128), moving: s.moving });
        }
        frames.push(Frm { t: f.time, dt, st: state, ball, cars, hit });
    }
    gen_slot = GEN_SLOT.with(|g| std::mem::take(&mut *g.borrow_mut()));
    let mut last: HashMap<(usize, usize), i32> = HashMap::new();
    for (f, g, c, v) in raw_ctr { if let Some(&slot) = gen_slot.get(&g) { let l = last.get(&(slot, c)).copied().unwrap_or(0); if v > l { ctr.push(CtrEv { f, slot, k: CTRS[c], v }); last.insert((slot, c), v); } } }
    ctr.sort_by_key(|e| e.f);
    let n = players.len();
    for fr in frames.iter_mut() { fr.cars.resize(n, None); }
    let id = props.get("Id").cloned().unwrap_or_default();
    let map = props.get("MapName").cloned().unwrap_or_default();
    let date = props.get("Date").cloned().unwrap_or_default();
    Ok(Match { playlist, frames, players, ctr, pads, demos, goals, props, team_size, state_names, map, date, id, score, overtime_hint: false })
}

thread_local! { static GEN_SLOT: std::cell::RefCell<HashMap<usize, usize>> = std::cell::RefCell::new(HashMap::new()); }
fn slot_for(pri: &mut HashMap<i32, PriSt>, players: &mut Vec<Pl>, slot_of_key: &mut HashMap<i32, usize>, _teams: &HashMap<i32, u8>, aid: i32) -> Option<usize> {
    let p = pri.get_mut(&aid)?;
    if let Some(s) = p.slot { return Some(s); }
    let key = p.key?; if p.name.is_empty() { return None; }
    let team = p.team?;
    let slot = if let Some(s) = slot_of_key.get(&key) { *s } else {
        players.push(Pl { key, name: p.name.clone(), epic: p.epic.clone(), team, bot: p.epic.is_empty() });
        let s = players.len() - 1; slot_of_key.insert(key, s); s };
    if players[slot].epic.is_empty() && !p.epic.is_empty() { players[slot].epic = p.epic.clone(); players[slot].bot = false; }
    players[slot].team = team;
    p.slot = Some(slot); GEN_SLOT.with(|g| g.borrow_mut().insert(p.pgen, slot)); Some(slot)
}
