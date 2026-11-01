import os
import re
import time
from PIL import Image
from concurrent.futures import ThreadPoolExecutor

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def get_sorted_images(folder_path):
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"Folder not found: {folder_path}")
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    files.sort(key=natural_sort_key)
    return [os.path.join(folder_path, f) for f in files]

def process_single_frame(task):
    src_path, dest_desktop, dest_mobile = task
    # Load image
    with Image.open(src_path) as im:
        im = im.convert('RGB')
        # Desktop 1600px wide
        w_d = 1600
        h_d = round(im.height * (w_d / im.width))
        im_d = im.resize((w_d, h_d), Image.Resampling.LANCZOS)
        im_d.save(dest_desktop, 'WEBP', quality=78)
        
        # Mobile 960px wide
        w_m = 960
        h_m = round(im.height * (w_m / im.width))
        im_m = im.resize((w_m, h_m), Image.Resampling.LANCZOS)
        im_m.save(dest_mobile, 'WEBP', quality=72)

def get_folder_size(path):
    total = 0
    for root, dirs, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            total += os.path.getsize(fp)
    return total

def main():
    start_time = time.time()
    
    # Define source folders
    clip1_dir = 'clip1 frame.zip'
    clip2_dir = 'clip2 frame'
    clip3_dir = 'clip3 frame'
    dismantle_dir = 'flow clip frame'
    
    # Destination directories
    hero_desktop_dir = os.path.join('assets', 'frames', 'hero')
    hero_mobile_dir = os.path.join('assets', 'frames', 'hero-mobile')
    dismantle_desktop_dir = os.path.join('assets', 'frames', 'dismantle')
    dismantle_mobile_dir = os.path.join('assets', 'frames', 'dismantle-mobile')
    
    for d in [hero_desktop_dir, hero_mobile_dir, dismantle_desktop_dir, dismantle_mobile_dir]:
        os.makedirs(d, exist_ok=True)
        
    c1_frames = get_sorted_images(clip1_dir)
    c2_frames = get_sorted_images(clip2_dir)
    c3_frames = get_sorted_images(clip3_dir)
    dismantle_frames = get_sorted_images(dismantle_dir)
    
    print(f"Found frames - Clip1: {len(c1_frames)}, Clip2: {len(c2_frames)}, Clip3: {len(c3_frames)}, Dismantle: {len(dismantle_frames)}")
    
    # Check boundary frames for hero
    # Clip 1 to Clip 2
    # If first frame of clip2 is identical to last of clip1, skip it
    hero_sources = list(c1_frames)
    if c2_frames:
        hero_sources.extend(c2_frames)
    if c3_frames:
        hero_sources.extend(c3_frames)
        
    print(f"Total hero frames to process: {len(hero_sources)}")
    print(f"Total dismantle frames to process: {len(dismantle_frames)}")
    
    tasks = []
    
    # Prepare Hero tasks
    for idx, src in enumerate(hero_sources, start=1):
        dest_d = os.path.join(hero_desktop_dir, f"frame_{idx:04d}.webp")
        dest_m = os.path.join(hero_mobile_dir, f"frame_{idx:04d}.webp")
        tasks.append((src, dest_d, dest_m))
        
    # Prepare Dismantle tasks
    for idx, src in enumerate(dismantle_frames, start=1):
        dest_d = os.path.join(dismantle_desktop_dir, f"frame_{idx:04d}.webp")
        dest_m = os.path.join(dismantle_mobile_dir, f"frame_{idx:04d}.webp")
        tasks.append((src, dest_d, dest_m))
        
    print(f"Executing {len(tasks)} frame processing tasks with ThreadPoolExecutor...")
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        list(executor.map(process_single_frame, tasks))
        
    elapsed = time.time() - start_time
    print(f"Conversion complete in {elapsed:.2f} seconds!")
    
    # Calculate sizes and counts
    stats = [
        ("Hero Desktop", hero_desktop_dir, len(hero_sources)),
        ("Hero Mobile", hero_mobile_dir, len(hero_sources)),
        ("Dismantle Desktop", dismantle_desktop_dir, len(dismantle_frames)),
        ("Dismantle Mobile", dismantle_mobile_dir, len(dismantle_frames)),
    ]
    
    print("\n--- RESULTS ---")
    for name, path, count in stats:
        size_bytes = get_folder_size(path)
        size_mb = size_bytes / (1024 * 1024)
        print(f"{name} ({path}): {count} frames, {size_mb:.2f} MB ({size_bytes:,} bytes)")

if __name__ == '__main__':
    main()

