import os
import pandas as pd
import numpy as np
import math
import plotly.graph_objs as go
from flask import Flask, request, jsonify
from flask_cors import CORS

DATA_DIR = "/Users/arjun/Desktop/nifty-fresh/database"

def load_combined_nifty_data(data_dir=DATA_DIR):
    files = [os.path.join(data_dir, f) for f in os.listdir(data_dir) if f.endswith(".csv")]
    if not files:
        raise ValueError(f"No CSV files found in {data_dir}")
    
    dfs = []
    for file in files:
        df = pd.read_csv(file, encoding="utf-8-sig", skipinitialspace=True)
        df.columns = df.columns.str.strip()
        df["Date"] = pd.to_datetime(df["Date"], format="%d-%b-%Y", errors="coerce")
        df.dropna(subset=["Date"], inplace=True)
        dfs.append(df)
    df_all = pd.concat(dfs, ignore_index=True)
    df_all.set_index("Date", inplace=True)
    df_all.sort_index(inplace=True)
    return df_all

def compute_historical_volatility(df, start_date, end_date, days_to_expiry):
    df_range = df.loc[start_date:end_date].copy()
    df_range["Log_Return"] = np.log(df_range["Close"] / df_range["Close"].shift(1))
    df_range.dropna(inplace=True)
    daily_std = df_range["Log_Return"].std()

    if days_to_expiry <= 7:
        return daily_std  # Use daily volatility
    else:
        return daily_std * np.sqrt(252)  # Annualize for longer-term

def normal_pdf(x, mu, sigma):
    return (1.0 / (sigma * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x - mu)/sigma)**2)

def build_bell_curve_fig(mean_price, annual_vol, days_to_expiry):
    t_frac = days_to_expiry / 252.0
    sigma_price = mean_price * annual_vol * math.sqrt(t_frac)
    sigma_price = max(sigma_price, 1e-9)

    x_range = [mean_price - 4 * sigma_price, mean_price + 4 * sigma_price]
    x_vals = np.linspace(x_range[0], x_range[1], 400)
    pdf_vals = normal_pdf(x_vals, mean_price, sigma_price)

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=x_vals,
        y=pdf_vals,
        mode='lines',
        fill='tozeroy',
        fillcolor='rgba(0, 119, 182, 0.2)',
        line=dict(color='#0077b6', width=3),
        name='Bell Curve',
        hovertemplate='NIFTY Price: ₹%{x:,.2f}<br>Density: %{y:.6f}<extra></extra>'
    ))

    y_max = max(pdf_vals.max(), 0.00045)
    for s in [1, 2, 3]:
        x_left = mean_price - s * sigma_price
        x_right = mean_price + s * sigma_price
        for x_ in (x_left, x_right):
            fig.add_shape(
                type="line",
                x0=x_, x1=x_,
                y0=0, y1=y_max,
                line=dict(dash="dot", color="rgba(100,100,100,0.5)", width=1)
            )
            fig.add_annotation(
                x=x_, y=y_max,
                text=f"{s}σ",
                showarrow=False,
                yshift=10
            )

    fig.update_layout(
        title=f"Bell Curve: Mean={mean_price:.2f}, Annual Vol={annual_vol:.4f}, Days to Expiry={days_to_expiry}",
        xaxis_title="NIFTY Price",
        yaxis_title="Probability Density",
        xaxis=dict(range=x_range),
        yaxis=dict(range=[0, y_max])
    )
    return fig

# ---- Flask API Setup ----

app = Flask(__name__)
CORS(app)

try:
    df = load_combined_nifty_data(DATA_DIR)
except Exception as e:
    print("Error loading data:", e)
    df = pd.DataFrame()

@app.route("/api/dates", methods=["GET"])
def get_dates():
    if df.empty:
        return jsonify({"error": "No data available"}), 500
    dates = sorted(df.index.strftime("%Y-%m-%d").unique())
    return jsonify({"dates": dates})

@app.route("/api/data", methods=["GET"])
def get_daily_data():
    date = request.args.get("date")
    if not date:
        return jsonify({"error": "Date parameter is required"}), 400
    try:
        date_parsed = pd.to_datetime(date)
        data_row = df.loc[date_parsed]
        if isinstance(data_row, pd.DataFrame):
            d = data_row.iloc[0]
        else:
            d = data_row
        result = {"Close": d["Close"]}
        return jsonify({"data": result})
    except Exception as e:
        return jsonify({"error": f"Error processing date: {e}"}), 400

@app.route("/api/bellcurve", methods=["GET"])
def get_bell_curve():
    try:
        start_date_str = request.args.get("start_date")
        end_date_str = request.args.get("end_date")
        days_to_expiry = int(request.args.get("days_to_expiry", 30))

        if not start_date_str or not end_date_str:
            return jsonify({"error": "start_date and end_date parameters are required"}), 400

        start_date = pd.to_datetime(start_date_str)
        end_date = pd.to_datetime(end_date_str)

        df_range = df.loc[start_date:end_date]
        if df_range.empty:
            return jsonify({"error": "No data in selected date range"}), 400

        mean_price = df_range["Close"].iloc[-1]
        annual_vol = compute_historical_volatility(df, start_date, end_date, days_to_expiry)

        fig = build_bell_curve_fig(mean_price, annual_vol, days_to_expiry)
        return jsonify(fig.to_plotly_json())
    except Exception as e:
        return jsonify({"error": f"Error building bell curve: {e}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
