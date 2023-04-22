import os
from pathlib import Path

import sanic
import pywebpush
import vcc

# Generate vapid keys
current_directory = Path(__file__).parent
os.chdir(current_directory)
if not (current_directory / "public_key.pem").exists():
    os.system("vapid --gen")

vapid_public_key = "".join((current_directory / "public_key.pem").read_text().split("\n")[1:-2])
vapid_private_key = "".join((current_directory / "public_key.pem").read_text().split("\n")[1:-2])

