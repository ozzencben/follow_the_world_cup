import json

rounds_path = "c:/Users/ozzenc/Desktop/follow_the_world_cup/backend/app/data/rounds.json"

with open(rounds_path, "r", encoding="utf-8") as f:
    rounds = json.load(f)

# Find matches by ID
match_47 = None
match_71 = None
match_53 = None
match_54 = None

# Remove from original rounds
for r in rounds:
    if r["stage"] == "GROUP":
        tournaments = r["tournaments"]
        # Find and remove
        for m in list(tournaments):
            if m["id"] == 47:
                match_47 = m
                tournaments.remove(m)
                print("Found and removed Match 47 (Uzbekistan vs Colombia) from Round", r["id"])
            elif m["id"] == 71:
                match_71 = m
                tournaments.remove(m)
                print("Found and removed Match 71 (Colombia vs Congo DR) from Round", r["id"])
            elif m["id"] == 53:
                match_53 = m
                tournaments.remove(m)
                print("Found and removed Match 53 (Ghana vs Panama) from Round", r["id"])
            elif m["id"] == 54:
                match_54 = m
                tournaments.remove(m)
                print("Found and removed Match 54 (Panama vs Croatia) from Round", r["id"])

# Append to correct rounds
# Round 1 is index 0
# Round 2 is index 1
# Round 3 is index 2

if match_47:
    rounds[0]["tournaments"].append(match_47)
    print("Added Match 47 to Round 1")
if match_53:
    rounds[0]["tournaments"].append(match_53)
    print("Added Match 53 to Round 1")

if match_71:
    rounds[1]["tournaments"].append(match_71)
    print("Added Match 71 to Round 2")
if match_54:
    rounds[1]["tournaments"].append(match_54)
    print("Added Match 54 to Round 2")

# Print new counts
print("\nNew round match counts:")
for r in rounds:
    if r["stage"] == "GROUP":
        print(f"Round {r['id']}: {len(r['tournaments'])} matches")

# Save back to file
with open(rounds_path, "w", encoding="utf-8") as f:
    json.dump(rounds, f, ensure_ascii=False, indent=4)

print("\nSaved corrected rounds.json successfully!")
