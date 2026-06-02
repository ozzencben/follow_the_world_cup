import json

with open("c:/Users/ozzenc/Desktop/follow_the_world_cup/backend/app/data/squads.json", "r", encoding="utf-8") as f:
    squads = json.load(f)

with open("c:/Users/ozzenc/Desktop/follow_the_world_cup/backend/app/data/rounds.json", "r", encoding="utf-8") as f:
    rounds = json.load(f)

# Build a mapping of squad name to group
squad_to_group = {}
for s in squads:
    squad_to_group[s["name"].lower()] = s["group"].upper()

print("Group mappings:")
for s in squads:
    if s["group"].upper() in ["K", "L"]:
        print(f"  {s['name']} -> Group {s['group'].upper()}")

print("\nGroup K & L matches:")
for r in rounds:
    if r["stage"] == "GROUP":
        print(f"\nRound {r['id']} (matches count: {len(r['tournaments'])}):")
        for m in r["tournaments"]:
            home_grp = squad_to_group.get(m["homeSquadName"].lower(), "UNKNOWN")
            away_grp = squad_to_group.get(m["awaySquadName"].lower(), "UNKNOWN")
            if home_grp in ["K", "L"] or away_grp in ["K", "L"]:
                print(f"  Match ID {m['id']}: {m['homeSquadName']} (Grp {home_grp}) vs {m['awaySquadName']} (Grp {away_grp})")
