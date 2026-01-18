# Bid wURLd
This browser extension lets you bid against AI to access a website.

## Installation
### Setting up the server

1. Clone this repo.
```
git clone https://github.com/antonTan96/hack_and_roll_2026.git
cd hack_and_roll_2026
```

2. Create a python virtual environment and activate it.
```
python3 -m venv .venv
source .venv/Scripts/activate
```

3. Install required modules.
```
pip install -r requirements.txt
```

4. Create a `.env` file and paste your OpenAI API key as follows:
```
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
```

5. Run the script.
```
python3 backend/main.py
```

### Client
1.  Open chrome://extensions on your Chrome browser and enable the developer mode on the top right corner.
2. On the top left corner, choose `Load unpacked` and select the `frontend` directory. You would see the extension loaded to your Chrome extensions collection.
![Chrome extension](./images/extension.png)