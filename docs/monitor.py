import psutil
import time
import datetime

LOG_FILE = "ram_report.txt"
INTERVAL = 2  # seconds between each reading

def find_process(keywords):
    """Find a process by matching keywords in its command line."""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info']):
        try:
            cmdline = " ".join(proc.info['cmdline'] or [])
            if all(k.lower() in cmdline.lower() for k in keywords):
                return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return None

def get_ram_mb(proc):
    try:
        return proc.memory_info().rss / 1024 / 1024
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return 0

def monitor():
    print("=" * 55)
    print("       RAM MONITOR - Frontend + Backend")
    print("=" * 55)
    print("Searching for your running processes...\n")

    # Auto-detect processes
    backend  = find_process(["uvicorn"])
    frontend = find_process(["vite"])

    if not backend:
        print("❌ Backend (uvicorn) not found. Make sure it's running.")
        return
    if not frontend:
        print("❌ Frontend (vite) not found. Make sure it's running.")
        return

    print(f"✅ Backend  found | PID: {backend.pid}")
    print(f"✅ Frontend found | PID: {frontend.pid}")
    print("\nMonitoring RAM... Press Ctrl+C to stop.\n")
    print(f"{'Time':<12} {'Backend (MB)':>14} {'Frontend (MB)':>15} {'Total (MB)':>12}")
    print("-" * 55)

    # Track stats
    start_time      = datetime.datetime.now()
    backend_start   = get_ram_mb(backend)
    frontend_start  = get_ram_mb(frontend)
    backend_peak    = backend_start
    frontend_peak   = frontend_start
    readings        = []

    try:
        while True:
            b_mem = get_ram_mb(backend)
            f_mem = get_ram_mb(frontend)
            total = b_mem + f_mem
            now   = datetime.datetime.now().strftime("%H:%M:%S")

            backend_peak  = max(backend_peak,  b_mem)
            frontend_peak = max(frontend_peak, f_mem)

            print(f"{now:<12} {b_mem:>14.2f} {f_mem:>15.2f} {total:>12.2f}")
            readings.append((now, b_mem, f_mem, total))

            time.sleep(INTERVAL)

    except KeyboardInterrupt:
        stop_time    = datetime.datetime.now()
        b_mem_stop   = get_ram_mb(backend)
        f_mem_stop   = get_ram_mb(frontend)
        duration     = str(stop_time - start_time).split(".")[0]

        print("\n" + "=" * 55)
        print("                  FINAL REPORT")
        print("=" * 55)
        print(f"  Duration           : {duration}")
        print(f"  Backend  - Start   : {backend_start:.2f} MB")
        print(f"  Backend  - Stop    : {b_mem_stop:.2f} MB")
        print(f"  Backend  - Peak    : {backend_peak:.2f} MB")
        print(f"  Frontend - Start   : {frontend_start:.2f} MB")
        print(f"  Frontend - Stop    : {f_mem_stop:.2f} MB")
        print(f"  Frontend - Peak    : {frontend_peak:.2f} MB")
        print(f"  Total at Start     : {backend_start + frontend_start:.2f} MB")
        print(f"  Total at Stop      : {b_mem_stop + f_mem_stop:.2f} MB")
        print(f"  Peak Total         : {backend_peak + frontend_peak:.2f} MB")
        print("=" * 55)

        # Save to file
        with open(LOG_FILE, "w") as f:
            f.write("RAM MONITORING REPORT\n")
            f.write(f"Start Time : {start_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Stop Time  : {stop_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Duration   : {duration}\n\n")
            f.write(f"{'Time':<12} {'Backend (MB)':>14} {'Frontend (MB)':>15} {'Total (MB)':>12}\n")
            f.write("-" * 55 + "\n")
            for r in readings:
                f.write(f"{r[0]:<12} {r[1]:>14.2f} {r[2]:>15.2f} {r[3]:>12.2f}\n")
            f.write("\nSUMMARY\n")
            f.write(f"Backend  Start/Stop/Peak : {backend_start:.2f} / {b_mem_stop:.2f} / {backend_peak:.2f} MB\n")
            f.write(f"Frontend Start/Stop/Peak : {frontend_start:.2f} / {f_mem_stop:.2f} / {frontend_peak:.2f} MB\n")
            f.write(f"Total    Start/Stop/Peak : {backend_start+frontend_start:.2f} / {b_mem_stop+f_mem_stop:.2f} / {backend_peak+frontend_peak:.2f} MB\n")

        print(f"\n📄 Report saved to: {LOG_FILE}")

if __name__ == "__main__":
    monitor()