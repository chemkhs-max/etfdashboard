import json
import urllib.request
import concurrent.futures
import time
import os
import math

API_URL_TPL = "https://stock.naver.com/api/stockSecurity/etfs/v2/domestic?listingType=aumDesc&size=100&index={}"

def fetch_page(page_idx):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://finance.naver.com/",
        "Accept": "application/json, text/plain, */*"
    }
    req = urllib.request.Request(API_URL_TPL.format(page_idx), headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        return page_idx, json.loads(response.read().decode('utf-8'))

def fetch_all_etfs():
    print("Fetching first page to determine totalCount...")
    page0_idx, first_page = fetch_page(0)
    total_count = int(first_page.get("totalCount", 0))
    page_size = int(first_page.get("size", 100))
    total_pages = math.ceil(total_count / page_size)
    print(f"Total ETFs: {total_count}, Pages needed: {total_pages}")
    
    all_pages = {0: first_page.get("items", [])}
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        future_to_page = {executor.submit(fetch_page, p): p for p in range(1, total_pages)}
        for future in concurrent.futures.as_completed(future_to_page):
            p = future_to_page[future]
            try:
                page_idx, data = future.result()
                all_pages[page_idx] = data.get("items", [])
                print(f"  - Page {page_idx + 1}/{total_pages} fetched ({len(all_pages[page_idx])} items)")
            except Exception as e:
                print(f"  ! Error fetching page {p}: {e}")
                
    # Combine in sorted order of page index
    all_items = []
    for p in range(total_pages):
        all_items.extend(all_pages.get(p, []))
        
    print(f"Successfully collected {len(all_items)} ETFs.")
    return {
        "updatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "totalCount": len(all_items),
        "items": all_items
    }

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    data = fetch_all_etfs()
    
    # Save standard JSON
    json_path = os.path.join("data", "etfs.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved JSON to {json_path} ({os.path.getsize(json_path):,} bytes)")
    
    # Save JS file for zero-config file:// loading
    js_path = os.path.join("data", "etfs_data.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("window.INITIAL_ETF_DATA = ")
        json.dump(data, f, ensure_ascii=False)
        f.write(";\n")
    print(f"Saved JS snapshot to {js_path} ({os.path.getsize(js_path):,} bytes)")
