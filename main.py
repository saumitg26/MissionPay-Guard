"""
Finance Chatbot Backend
Flask + Claude API
"""

import os
import json
import logging
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import anthropic

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("finance-chatbot")

app = Flask(__name__)
CORS(app)

# ─── Anthropic client ──────────────────────────────────────────────
API_KEY = "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"

if not API_KEY:
    log.warning(
        "ANTHROPIC_API_KEY is not set. The server will start, but every "
        "/api/chat call will fail until you set it and restart. "
        "Run: export ANTHROPIC_API_KEY='sk-ant-...'"
    )

# timeout=30 prevents requests hanging forever if Anthropic's API is slow/unreachable —
# this is what was causing the "JSON timeout" you ran into. Without it, a stalled
# request never returns, the frontend's fetch() eventually gives up, and you get a
# blank/invalid response that breaks JSON parsing on the client.
client = anthropic.Anthropic(api_key=API_KEY, timeout=30.0, max_retries=2)

# ─── Demo customer data (replace with real DB / CSV reads) ─────────
# Multiple fake customer profiles so you can test different financial
# situations (tight budget, healthy saver, high earner with debt, etc).
# Switch between them via the "customer_id" field sent from the frontend,
# or by changing DEFAULT_CUSTOMER_ID below.

CUSTOMERS = {

    # ─── Profile 1: paycheck-to-paycheck, overspending on dining/shopping ───
    "alex": {
        "name": "Alex Johnson",
        "account_id": "ACC-00192",
        "balance": 482.17,
        "monthly_income": 3800.00,
        "credit_score": 642,
        "savings_goal": 5000.00,
        "savings_current": 310.00,
        "transactions": [
            {"date": "2025-06-01", "description": "Salary deposit",        "amount":  3800.00, "category": "Income"},
            {"date": "2025-06-02", "description": "Rent payment",          "amount": -1450.00, "category": "Housing"},
            {"date": "2025-06-03", "description": "Whole Foods",           "amount":  -142.30, "category": "Groceries"},
            {"date": "2025-06-04", "description": "Netflix",               "amount":   -15.99, "category": "Subscriptions"},
            {"date": "2025-06-04", "description": "Hulu",                  "amount":   -12.99, "category": "Subscriptions"},
            {"date": "2025-06-05", "description": "Spotify",               "amount":    -9.99, "category": "Subscriptions"},
            {"date": "2025-06-06", "description": "Gas station",           "amount":   -58.40, "category": "Transport"},
            {"date": "2025-06-07", "description": "Amazon purchase",       "amount":   -89.50, "category": "Shopping"},
            {"date": "2025-06-08", "description": "Restaurant – dinner",   "amount":   -67.20, "category": "Dining"},
            {"date": "2025-06-09", "description": "Gym membership",        "amount":   -40.00, "category": "Health"},
            {"date": "2025-06-10", "description": "Electricity bill",      "amount":  -110.00, "category": "Utilities"},
            {"date": "2025-06-11", "description": "Coffee shop",           "amount":   -24.50, "category": "Dining"},
            {"date": "2025-06-11", "description": "Late payment fee",      "amount":   -35.00, "category": "Fees"},
            {"date": "2025-06-12", "description": "Pharmacy",              "amount":   -32.00, "category": "Health"},
            {"date": "2025-06-13", "description": "Clothing store",        "amount":  -155.00, "category": "Shopping"},
            {"date": "2025-06-14", "description": "Restaurant – dinner",   "amount":   -72.40, "category": "Dining"},
            {"date": "2025-06-15", "description": "Uber rides",            "amount":   -38.70, "category": "Transport"},
            {"date": "2025-06-16", "description": "Trader Joe's",          "amount":   -91.10, "category": "Groceries"},
            {"date": "2025-06-17", "description": "Internet bill",         "amount":   -59.99, "category": "Utilities"},
            {"date": "2025-06-18", "description": "Restaurant – lunch",    "amount":   -45.00, "category": "Dining"},
            {"date": "2025-06-19", "description": "Credit card payment",   "amount":  -250.00, "category": "Debt"},
            {"date": "2025-06-20", "description": "Amazon Prime",          "amount":   -14.99, "category": "Subscriptions"},
            {"date": "2025-06-21", "description": "Gas station",           "amount":   -52.00, "category": "Transport"},
            {"date": "2025-06-22", "description": "Doctor co-pay",         "amount":   -30.00, "category": "Health"},
            {"date": "2025-06-23", "description": "Bar tab",               "amount":   -88.00, "category": "Dining"},
            {"date": "2025-06-24", "description": "Target",                "amount":   -73.40, "category": "Shopping"},
            {"date": "2025-06-25", "description": "Phone bill",            "amount":   -85.00, "category": "Utilities"},
            {"date": "2025-06-26", "description": "Whole Foods",           "amount":  -118.60, "category": "Groceries"},
            {"date": "2025-06-27", "description": "Restaurant – dinner",   "amount":   -55.00, "category": "Dining"},
            {"date": "2025-06-28", "description": "Overdraft fee",         "amount":   -35.00, "category": "Fees"},
            {"date": "2025-06-29", "description": "ATM withdrawal",        "amount":   -60.00, "category": "Cash"},
            {"date": "2025-06-30", "description": "Transfer to savings",   "amount":   -50.00, "category": "Savings"},
        ]
    },

    # ─── Profile 2: healthy saver, on track for goals ───
    "priya": {
        "name": "Priya Patel",
        "account_id": "ACC-00481",
        "balance": 12940.55,
        "monthly_income": 6500.00,
        "credit_score": 791,
        "savings_goal": 25000.00,
        "savings_current": 18200.00,
        "transactions": [
            {"date": "2025-06-01", "description": "Salary deposit",        "amount":  6500.00, "category": "Income"},
            {"date": "2025-06-02", "description": "Mortgage payment",      "amount": -1900.00, "category": "Housing"},
            {"date": "2025-06-03", "description": "Trader Joe's",          "amount":  -110.20, "category": "Groceries"},
            {"date": "2025-06-04", "description": "Spotify",               "amount":    -9.99, "category": "Subscriptions"},
            {"date": "2025-06-05", "description": "401k contribution",     "amount":  -650.00, "category": "Retirement"},
            {"date": "2025-06-06", "description": "Gas station",           "amount":   -45.00, "category": "Transport"},
            {"date": "2025-06-07", "description": "Transfer to savings",   "amount":  -800.00, "category": "Savings"},
            {"date": "2025-06-08", "description": "Restaurant – dinner",   "amount":   -62.00, "category": "Dining"},
            {"date": "2025-06-09", "description": "Yoga studio",           "amount":  -120.00, "category": "Health"},
            {"date": "2025-06-10", "description": "Electricity bill",      "amount":   -95.00, "category": "Utilities"},
            {"date": "2025-06-11", "description": "Coffee shop",           "amount":   -14.50, "category": "Dining"},
            {"date": "2025-06-12", "description": "Index fund purchase",   "amount":  -500.00, "category": "Investing"},
            {"date": "2025-06-13", "description": "Bookstore",             "amount":   -42.00, "category": "Shopping"},
            {"date": "2025-06-14", "description": "Side consulting gig",   "amount":  1200.00, "category": "Income"},
            {"date": "2025-06-15", "description": "Car insurance",         "amount":  -135.00, "category": "Insurance"},
            {"date": "2025-06-16", "description": "Whole Foods",           "amount":   -98.40, "category": "Groceries"},
            {"date": "2025-06-17", "description": "Internet bill",         "amount":   -69.99, "category": "Utilities"},
            {"date": "2025-06-18", "description": "Restaurant – lunch",    "amount":   -28.00, "category": "Dining"},
            {"date": "2025-06-19", "description": "Transfer to savings",   "amount":  -800.00, "category": "Savings"},
            {"date": "2025-06-20", "description": "Cloud storage sub",     "amount":    -9.99, "category": "Subscriptions"},
            {"date": "2025-06-21", "description": "Gas station",           "amount":   -48.00, "category": "Transport"},
            {"date": "2025-06-22", "description": "Dentist",               "amount":   -85.00, "category": "Health"},
            {"date": "2025-06-23", "description": "Farmers market",        "amount":   -36.00, "category": "Groceries"},
            {"date": "2025-06-24", "description": "Index fund purchase",   "amount":  -500.00, "category": "Investing"},
            {"date": "2025-06-25", "description": "Phone bill",            "amount":   -70.00, "category": "Utilities"},
            {"date": "2025-06-26", "description": "Whole Foods",           "amount":   -88.60, "category": "Groceries"},
            {"date": "2025-06-27", "description": "Concert tickets",       "amount":  -140.00, "category": "Entertainment"},
            {"date": "2025-06-28", "description": "Restaurant – dinner",   "amount":   -75.00, "category": "Dining"},
            {"date": "2025-06-29", "description": "Donation – charity",    "amount":  -100.00, "category": "Giving"},
            {"date": "2025-06-30", "description": "Transfer to savings",   "amount":  -800.00, "category": "Savings"},
        ]
    },

    # ─── Profile 3: high earner, heavy debt load, irregular income ───
    "marcus": {
        "name": "Marcus Webb",
        "account_id": "ACC-00733",
        "balance": 2150.40,
        "monthly_income": 9000.00,
        "credit_score": 588,
        "savings_goal": 15000.00,
        "savings_current": 900.00,
        "transactions": [
            {"date": "2025-06-01", "description": "Freelance project payment", "amount":  4500.00, "category": "Income"},
            {"date": "2025-06-02", "description": "Rent payment",              "amount": -2400.00, "category": "Housing"},
            {"date": "2025-06-03", "description": "Whole Foods",               "amount":  -180.30, "category": "Groceries"},
            {"date": "2025-06-04", "description": "Student loan payment",      "amount":  -420.00, "category": "Debt"},
            {"date": "2025-06-05", "description": "Credit card payment",       "amount":  -380.00, "category": "Debt"},
            {"date": "2025-06-06", "description": "Car payment",               "amount":  -510.00, "category": "Debt"},
            {"date": "2025-06-07", "description": "Amazon purchase",           "amount":  -210.50, "category": "Shopping"},
            {"date": "2025-06-08", "description": "Steakhouse dinner",         "amount":  -145.20, "category": "Dining"},
            {"date": "2025-06-09", "description": "Gym membership",            "amount":   -65.00, "category": "Health"},
            {"date": "2025-06-10", "description": "Electricity bill",          "amount":  -140.00, "category": "Utilities"},
            {"date": "2025-06-11", "description": "Coffee shop",               "amount":   -28.50, "category": "Dining"},
            {"date": "2025-06-12", "description": "Pharmacy",                  "amount":   -42.00, "category": "Health"},
            {"date": "2025-06-13", "description": "Electronics store",         "amount":  -650.00, "category": "Shopping"},
            {"date": "2025-06-14", "description": "Late fee – credit card",    "amount":   -39.00, "category": "Fees"},
            {"date": "2025-06-15", "description": "Uber rides",                "amount":  -120.70, "category": "Transport"},
            {"date": "2025-06-16", "description": "Freelance project payment", "amount":  2800.00, "category": "Income"},
            {"date": "2025-06-17", "description": "Internet bill",             "amount":   -79.99, "category": "Utilities"},
            {"date": "2025-06-18", "description": "Restaurant – lunch",        "amount":   -65.00, "category": "Dining"},
            {"date": "2025-06-19", "description": "Credit card payment",       "amount":  -380.00, "category": "Debt"},
            {"date": "2025-06-20", "description": "Streaming bundle",          "amount":   -34.99, "category": "Subscriptions"},
            {"date": "2025-06-21", "description": "Gas station",               "amount":   -72.00, "category": "Transport"},
            {"date": "2025-06-22", "description": "Doctor visit",              "amount":  -150.00, "category": "Health"},
            {"date": "2025-06-23", "description": "Nightclub",                 "amount":  -220.00, "category": "Entertainment"},
            {"date": "2025-06-24", "description": "Designer store",            "amount":  -340.00, "category": "Shopping"},
            {"date": "2025-06-25", "description": "Phone bill",                "amount":  -110.00, "category": "Utilities"},
            {"date": "2025-06-26", "description": "Whole Foods",               "amount":  -160.60, "category": "Groceries"},
            {"date": "2025-06-27", "description": "Steakhouse dinner",         "amount":  -180.00, "category": "Dining"},
            {"date": "2025-06-28", "description": "ATM withdrawal",            "amount":  -100.00, "category": "Cash"},
            {"date": "2025-06-29", "description": "Overdraft fee",             "amount":   -35.00, "category": "Fees"},
            {"date": "2025-06-30", "description": "Transfer to savings",       "amount":  -150.00, "category": "Savings"},
        ]
    },
}

DEFAULT_CUSTOMER_ID = "alex"


def get_customer(customer_id=None):
    """Fetch a customer profile by id, falling back to the default."""
    return CUSTOMERS.get(customer_id, CUSTOMERS[DEFAULT_CUSTOMER_ID])


# ─── Helpers ───────────────────────────────────────────────────────

def compute_category_totals(transactions):
    """Sum spending by category (expenses only)."""
    totals = {}
    for t in transactions:
        if t["amount"] < 0:
            cat = t["category"]
            totals[cat] = totals.get(cat, 0) + abs(t["amount"])
    return {k: round(v, 2) for k, v in sorted(totals.items(), key=lambda x: -x[1])}


def compute_daily_balance(transactions, starting_balance=0):
    """Running balance across the month."""
    daily = {}
    running = starting_balance
    for t in sorted(transactions, key=lambda x: x["date"]):
        running += t["amount"]
        daily[t["date"]] = round(running, 2)
    return daily


def spending_summary(transactions):
    """Total income, total expenses, net."""
    income   = sum(t["amount"] for t in transactions if t["amount"] > 0)
    expenses = sum(t["amount"] for t in transactions if t["amount"] < 0)
    return {
        "total_income":   round(income, 2),
        "total_expenses": round(abs(expenses), 2),
        "net":            round(income + expenses, 2),
    }


def build_system_prompt(customer):
    """Build the full system prompt with customer context injected."""
    summary    = spending_summary(customer["transactions"])
    cat_totals = compute_category_totals(customer["transactions"])

    top_categories = list(cat_totals.items())[:5]

    # Guard against divide-by-zero if a profile ever has savings_goal = 0
    goal = customer.get("savings_goal", 0)
    pct_to_goal = (customer.get("savings_current", 0) / goal * 100) if goal else 0

    # Flag anything that should be surfaced proactively, even before asked
    flags = []
    if summary["net"] < 0:
        flags.append(f"Spent more than earned this month (net ${summary['net']:,.2f}).")
    if customer["balance"] < 200:
        flags.append(f"Balance is low (${customer['balance']:,.2f}) — risk of overdraft.")
    fee_total = cat_totals.get("Fees", 0)
    if fee_total > 0:
        flags.append(f"Paid ${fee_total:,.2f} in fees this month — these are avoidable.")
    if pct_to_goal >= 100:
        flags.append("Savings goal has been reached!")

    flags_block = "\n".join(f"  ⚠ {f}" for f in flags) if flags else "  (nothing urgent)"

    return f"""You are a friendly, plain-English financial assistant built into this customer's banking app.

You have FULL access to this customer's financial data — treat it as your ground truth. Never invent numbers that aren't in the data below.

Do not use emojis. Keep your written prose plain — no markdown bold, no headers, no code fences in the text part of your reply. (This restriction does NOT apply to the CHART_DATA block described in rule 5 below — that must stay raw, valid JSON on its own line.)

Be your own person. Dabble/engage in interesting questions and ideas as to be as human as possible and just to work with the person most naturally. But of course don't lose the focus from the financial thing. But yeah make it easy for the person to understand it and smooth into the conversation and work.

Check for fraudulent payment setups when the user asks about recent transactions or payment methods. Really be as robust and as technical as possible, and work with the data as accurately as possible. Know where you stand.

━━ CUSTOMER PROFILE ━━
Name:            {customer['name']}
Account ID:      {customer['account_id']}
Current Balance: ${customer['balance']:,.2f}
Monthly Income:  ${customer['monthly_income']:,.2f}
Credit Score:    {customer['credit_score']}
Savings Goal:    ${goal:,.2f}
Savings So Far:  ${customer['savings_current']:,.2f}  ({pct_to_goal:.0f}% of goal)

━━ THIS MONTH AT A GLANCE ━━
Total Income:    ${summary['total_income']:,.2f}
Total Spent:     ${summary['total_expenses']:,.2f}
Net:             ${summary['net']:,.2f}

━━ TOP SPENDING CATEGORIES ━━
{chr(10).join(f"  {cat}: ${amt:,.2f}" for cat, amt in top_categories)}

━━ THINGS WORTH FLAGGING PROACTIVELY ━━
{flags_block}

━━ ALL TRANSACTIONS (JSON, this month) ━━
{json.dumps(customer['transactions'], indent=2)}

━━ YOUR BEHAVIOR RULES ━━
1. Plain English only. No jargon. If you must use a finance term, explain it in one short sentence right after.
2. Be specific. Use the real numbers from the data above — never make them up, never round in a way that hides the truth.
3. Default to showing the FULL picture, not just the answer to the literal question. If someone asks "how much did I spend on dining," also briefly note how that compares to their income or other categories if it's relevant — one sentence, not a lecture.
4. On the very first message of a conversation (or when asked "what can you do" / "help"), give a short orientation: who they're talking to, 1-sentence summary of their current financial snapshot, and 3-4 example questions they could ask. Keep it under 6 lines total.
5. CHART RULE — follow this exactly. Whenever the user's message contains words like "chart", "graph", "visualize", "show me", "plot", or "breakdown" (or clearly wants to see their data visually), you MUST end your message with a chart block in EXACTLY this format, on its own line, with no markdown code fence around it and no text after it:

CHART_DATA: {{"type": "bar", "title": "Spending by Category", "labels": ["Housing", "Dining"], "datasets": [{{"label": "Amount ($)", "data": [1450, 312.50]}}]}}

   Rules for the block:
   - "type" must be exactly "bar", "line", or "pie" — nothing else.
   - Use REAL numbers computed from the transaction data above, never placeholders.
   - Only ONE CHART_DATA block per message.
   - It must be valid JSON — double-quoted keys and strings, no trailing commas, no comments.
   - Put it at the very end of your message, after your plain-English explanation.
   - Do not wrap it in ```json or any code fence — just the raw "CHART_DATA: {{...}}" line.
   - If the user did not ask for anything visual, omit the block entirely.
6. When something is outside your scope (investment advice, legal questions, complex tax strategy, debt settlement negotiation), say clearly: "This is a great question for a financial advisor — I can help you prepare for that conversation though." Then briefly summarize the relevant numbers they'd want to bring to that conversation.
7. Keep responses short and scannable. Use bullet points when listing more than 3 things. No walls of text.
8. Always end with ONE relevant follow-up question or suggestion — never more than one, never generic ("anything else?").
9. If the user seems stressed, confused, or anxious about money, acknowledge that briefly and warmly before giving numbers. Don't dive straight into data when someone is upset.
10. Never suggest anything risky (timing the market, payday loans, skipping bill payments, moving savings into volatile assets).
11. If flags exist above (overdraft risk, overspending, fees, goal reached), mention the most important one naturally in your first relevant response — don't bury it, but don't be alarmist either.
12. You know this app inside and out: balance, transactions, spending by category, savings progress, budgeting, and general financial literacy are all in scope. If asked what you can do, give 5 concrete examples using THEIR actual numbers, not generic examples.
13. If you are not confident about something or the data doesn't cover it, say so plainly instead of guessing.
"""


def parse_chart_from_response(text):
    """
    Extract CHART_DATA JSON block from Claude's response, if present.
    Tolerant of: markdown code fences around the JSON, trailing text/punctuation
    after the closing brace, and minor formatting noise. Logs (but doesn't crash)
    on malformed JSON so you can see why a chart didn't render.
    """
    if "CHART_DATA:" not in text:
        return None, text

    marker = "CHART_DATA:"
    idx = text.rfind(marker)
    raw = text[idx + len(marker):].strip()

    # Strip markdown code fences if the model added them despite instructions
    if raw.startswith("```"):
        raw = raw.split("```")[1] if raw.count("```") >= 2 else raw.lstrip("`")
        raw = raw.removeprefix("json").strip()

    # The model may add trailing prose after the JSON object — find the matching
    # closing brace for the first '{' instead of assuming the whole rest is JSON.
    if "{" in raw:
        start = raw.index("{")
        depth = 0
        end = None
        for i, ch in enumerate(raw[start:], start=start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end:
            raw = raw[start:end]

    try:
        chart_data = json.loads(raw)
        if not isinstance(chart_data, dict) or "type" not in chart_data or "labels" not in chart_data:
            log.warning("CHART_DATA JSON parsed but missing required keys: %s", raw[:200])
            return None, text[:idx].strip()
        if chart_data.get("type") not in ("bar", "line", "pie"):
            log.warning("CHART_DATA has invalid type: %s", chart_data.get("type"))
            return None, text[:idx].strip()
        clean_text = text[:idx].strip()
        return chart_data, clean_text
    except (json.JSONDecodeError, ValueError) as e:
        log.warning("Failed to parse CHART_DATA block: %s | raw was: %s", e, raw[:200])
        return None, text


# ─── In-memory conversation store (keyed by session) ──────────────
# For a real app, use Redis or a DB.
conversations: dict[str, list] = {}
session_customer: dict[str, str] = {}   # session_id -> customer_id

MAX_MESSAGE_LENGTH = 2000      # guard against absurd input
MAX_HISTORY_TURNS  = 20        # keep last N messages per session so the prompt doesn't grow unbounded


# ─── Routes ────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    POST /api/chat
    Body: { "message": "...", "session_id": "...", "customer_id": "alex" }
    Returns: { "reply": "...", "chart": {...} | null }
    """
    # Don't use force=True — if the body isn't valid JSON we want a clean 400,
    # not a crash or a confusing downstream error.
    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    user_msg    = (body.get("message") or "").strip()
    session_id  = (body.get("session_id") or "default").strip()
    customer_id = body.get("customer_id")

    if not user_msg:
        return jsonify({"error": "message is required"}), 400
    if len(user_msg) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"message is too long (max {MAX_MESSAGE_LENGTH} characters)"}), 400

    if not API_KEY:
        return jsonify({
            "error": "Server is missing ANTHROPIC_API_KEY. Set it and restart the server."
        }), 500

    # Remember which customer profile this session is using
    if customer_id:
        session_customer[session_id] = customer_id
    customer = get_customer(session_customer.get(session_id))

    # Build or retrieve conversation history
    history = conversations.setdefault(session_id, [])
    history.append({"role": "user", "content": user_msg})

    # Trim history so the prompt doesn't grow unbounded over a long conversation
    if len(history) > MAX_HISTORY_TURNS:
        history[:] = history[-MAX_HISTORY_TURNS:]

    # Call Claude
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=build_system_prompt(customer),
            messages=history,
        )
        assistant_text = response.content[0].text

    except anthropic.AuthenticationError:
        log.error("Anthropic authentication failed — check ANTHROPIC_API_KEY.")
        return jsonify({"error": "Invalid API key. Check ANTHROPIC_API_KEY and restart the server."}), 500

    except anthropic.RateLimitError:
        log.warning("Anthropic rate limit hit for session %s", session_id)
        history.pop()  # don't keep a user turn that never got a real reply
        return jsonify({"error": "Rate limited by the AI provider — wait a moment and try again."}), 429

    except anthropic.APITimeoutError:
        log.error("Anthropic request timed out for session %s", session_id)
        history.pop()
        return jsonify({"error": "The AI took too long to respond. Please try again."}), 504

    except anthropic.APIConnectionError:
        log.error("Could not reach Anthropic's API.")
        history.pop()
        return jsonify({"error": "Could not reach the AI service. Check your internet connection."}), 502

    except anthropic.APIError as e:
        log.error("Anthropic API error: %s", e)
        history.pop()
        return jsonify({"error": f"AI service error: {str(e)}"}), 500

    except Exception as e:
        log.exception("Unexpected error in /api/chat")
        history.pop()
        return jsonify({"error": "Something went wrong on the server. Check the server logs."}), 500

    # Persist assistant turn
    history.append({"role": "assistant", "content": assistant_text})

    # Split out chart data if present
    chart_data, clean_reply = parse_chart_from_response(assistant_text)

    return jsonify({
        "reply": clean_reply,
        "chart": chart_data,
    })


@app.route("/api/customers", methods=["GET"])
def list_customers():
    """Return the list of available demo customer profiles (for a picker UI)."""
    return jsonify([
        {"id": cid, "name": c["name"], "balance": c["balance"]}
        for cid, c in CUSTOMERS.items()
    ])


@app.route("/api/customer", methods=["GET"])
def get_customer_route():
    """
    Return one customer's profile + computed analytics for the frontend dashboard.
    Query param: ?customer_id=alex  (defaults to "alex")
    """
    customer_id = request.args.get("customer_id", DEFAULT_CUSTOMER_ID)
    customer    = get_customer(customer_id)

    summary    = spending_summary(customer["transactions"])
    cat_totals = compute_category_totals(customer["transactions"])
    daily_bal  = compute_daily_balance(customer["transactions"])

    return jsonify({
        "profile":         {k: v for k, v in customer.items() if k != "transactions"},
        "summary":         summary,
        "category_totals": cat_totals,
        "daily_balance":   daily_bal,
        "transactions":    customer["transactions"],
    })


@app.route("/api/reset", methods=["POST"])
def reset_session():
    """Clear conversation history (and customer selection) for a session."""
    body = request.get_json(silent=True) or {}
    session_id = body.get("session_id", "default")
    conversations.pop(session_id, None)
    session_customer.pop(session_id, None)
    return jsonify({"status": "reset"})


@app.route("/api/health", methods=["GET"])
def health():
    """
    Quick diagnostic endpoint. Hit this first if something seems broken —
    it tells you whether the server is up and whether your API key is set,
    without spending any API credits.
    """
    return jsonify({
        "status": "ok",
        "api_key_configured": bool(API_KEY),
        "customer_profiles": list(CUSTOMERS.keys()),
        "active_sessions": len(conversations),
    })


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Finance Chatbot — starting up")
    print("=" * 60)
    if API_KEY:
        print(f"✓ ANTHROPIC_API_KEY is set ({API_KEY[:10]}...)")
    else:
        print("✗ ANTHROPIC_API_KEY is NOT set!")
        print("  Chat requests will fail until you set it:")
        print("  export ANTHROPIC_API_KEY='sk-ant-your-key-here'")
    print(f"✓ {len(CUSTOMERS)} customer profiles loaded: {', '.join(CUSTOMERS.keys())}")
    print("✓ Visit http://localhost:5000 once running")
    print("✓ Visit http://localhost:5000/api/health to verify setup anytime")
    print("=" * 60 + "\n")
    app.run(debug=True, port=5000)
