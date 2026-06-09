import csv
import os

# Use script's directory as base path to ensure it works when run from any folder
base_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_dir, "performers.csv")
js_path = os.path.join(base_dir, "data.js")

if not os.path.exists(csv_path):
    print("請先在專案目錄下建立 'performers.csv' 檔案！")
    print("CSV 欄位格式（第一列標頭）請採用以下英文名稱：")
    print("category,id,name,circle,xingYuan,jingSi,lamp,bigV")
    print("\n範例資料內容：")
    print("category,id,name,circle,xingYuan,jingSi,lamp,bigV")
    print("A藍,4-46,范志偉,5.2-46.2,2-49,4-46,12.4-41.6,3-49.6")
    print("B白,19-54,柯博文,16.8-54.2,18-58,19-54,31-30,23.8-39")
else:
    performers = []
    # Using utf-8-sig to automatically handle Excel BOM if present
    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Clean and strip values
            p = {
                "category": (row.get("category") or row.get("身分別") or "").strip(),
                "id": (row.get("id") or row.get("身份證") or "").strip(),
                "name": (row.get("name") or row.get("姓名") or "").strip(),
                "circle": (row.get("circle") or row.get("01圓形") or "").strip(),
                "xingYuan": (row.get("xingYuan") or row.get("02行願") or "").strip(),
                "jingSi": (row.get("jingSi") or row.get("04靜思家風") or "").strip(),
                "lamp": (row.get("lamp") or row.get("05-1有法船") or "").strip(),
                "noBoat": (row.get("noBoat") or row.get("05-2無法船") or "").strip(),
                "bigV": (row.get("bigV") or row.get("06四弘誓願") or "").strip()
            }
            # Add only if id is present (name is optional as it can be empty)
            if p["id"]:
                performers.append(p)
                
    # Generate data.js format content
    js_content = "// Performer Stage Formations Database\nconst performersData = [\n"
    for idx, p in enumerate(performers):
        comma = "," if idx < len(performers) - 1 else ""
        js_content += f'  {{ category: "{p["category"]}", id: "{p["id"]}", name: "{p["name"]}", circle: "{p["circle"]}", xingYuan: "{p["xingYuan"]}", jingSi: "{p["jingSi"]}", lamp: "{p["lamp"]}", noBoat: "{p["noBoat"]}", bigV: "{p["bigV"]}" }}{comma}\n'
    js_content += "];\n\n// Export if in node environment, otherwise make it global\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = performersData;\n}\n"
    
    with open(js_path, mode='w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"成功！已批次匯入 {len(performers)} 筆表演者名單至 data.js 檔案！")
