import re
import json
from collections import defaultdict

def clean(value):
    return value.strip().strip('"').strip(',')

def parse_courts(text):
    courts = []
    current_court = {}
    location = {}
    departments = []
    inside_location = False
    inside_department = False
    current_dept = {}
    
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        if 'courtName' in line:
            if current_court:
                if location:
                    location['departments'] = departments
                    current_court['locations'] = [location]
                courts.append(current_court)
                current_court = {}
                location = {}
                departments = []
            current_court['name'] = clean(line.split(":", 1)[1])
            current_court['jurisdiction'] = "superior court" if "Superior" in current_court['name'] else "supreme court" if "Supreme" in current_court['name'] else "appellate court"
            current_court['level'] = current_court['jurisdiction'].replace(" court", "")
            current_court['state'] = "California"
            if "Superior" in current_court['name']:
                parts = current_court['name'].split("County")
                if len(parts) > 1:
                    current_court['county'] = clean(parts[0])

        elif 'branchName' in line:
            location['name'] = clean(line.split(":", 1)[1])
        elif 'address' in line:
            location['address'] = clean(line.split(":", 1)[1])
        elif 'phone' in line and not inside_department:
            location['phone'] = clean(line.split(":", 1)[1])
        elif 'website' in line:
            location['website'] = clean(line.split(":", 1)[1])
        elif 'caseTypes' in line:
            case_types = re.findall(r'"([^"]+)"', line)
            location['caseTypes'] = case_types
        elif 'departments' in line:
            inside_department = True
        elif inside_department:
            if '{' in line:
                current_dept = {}
            elif 'number' in line:
                current_dept['number'] = clean(line.split(":", 1)[1])
            elif 'judge' in line or 'judges' in line:
                match = re.search(r'"([^"]+)"', line)
                if match:
                    current_dept['judge'] = match.group(1)
            elif 'phone' in line:
                current_dept['phone'] = clean(line.split(":", 1)[1])
            elif '}' in line:
                departments.append(current_dept)
                current_dept = {}

    # Append final court
    if current_court:
        if location:
            location['departments'] = departments
            current_court['locations'] = [location]
        courts.append(current_court)

    return courts

# Load the raw data
with open("courtsData.txt", "r", encoding="utf-8") as f:
    raw_data = f.read()

# Parse and save
parsed = parse_courts(raw_data)
with open("restructured_courts.json", "w", encoding="utf-8") as f:
    json.dump(parsed, f, indent=2)
