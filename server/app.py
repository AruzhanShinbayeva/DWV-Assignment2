from flask import Flask, render_template, jsonify, request
from collections import deque, defaultdict
import time
import os

app = Flask(__name__,
            template_folder='../templates',
            static_folder='../static')

# Data storage
packages = deque(maxlen=2000)
ip_metadata = defaultdict(dict)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/packages', methods=['POST'])
def receive_package():
    package = request.get_json()
    packages.append(package)
    return jsonify({'status': 'success'})


@app.route('/api/visualization-data')
def get_visualization_data():
    # Process last 100 packages
    recent = list(packages)[-100:]

    data = []
    for package in recent:
        print(package)
        data.append(
            {
                "ip": package["ip address"],
                "latitude": float(package["Latitude"]),
                "longitude": float(package["Longitude"]),
                "timestamp": int(package["Timestamp"]),
            }
        )
    return data


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)