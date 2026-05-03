#!/bin/bash
# Setup environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
echo "Setup complete."
