import json

PATH = './data/faculty_network_filtered.json'

def load_data(path):
    with open(path, 'r', encoding='utf-8') as file:
        return json.load(file)

from itertools import combinations
import csv


def build_department_edges(nodes, output_path):
    by_department = {}
    for node in nodes:
        by_department.setdefault(node["department"], []).append(node)
    with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["source_id", "target_id", "department"])
        for department, members in by_department.items():
            for source, target in combinations(members, 2):
                writer.writerow([source["id"], target["id"], department])


def main():
    data = load_data(PATH)
    build_department_edges(data["nodes"], "./data/faculty_department_edges.csv")


if __name__ == "__main__":
    main()