#!/bin/bash

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies with uv
pip install uv
uv pip install -r requirements.txt

echo "Setup complete! Activate the virtual environment with: source venv/bin/activate" 