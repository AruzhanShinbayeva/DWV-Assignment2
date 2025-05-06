import csv
import json
import time
import requests
from datetime import datetime


def send_packages():
    with open('ip_addresses.csv', 'r') as file:
        reader = csv.DictReader(file)
        first_row = next(reader)

        initial_time = datetime.fromtimestamp(int(first_row['Timestamp']))
        send_package(first_row)

        for row in reader:
            current_time = datetime.fromtimestamp(int(row['Timestamp']))
            time_diff = (current_time - initial_time).total_seconds()
            if time_diff > 0:
                time.sleep(time_diff)
            send_package(row)
            initial_time = current_time


def send_package(package):
    requests.post('http://web:5000/api/packages',
                 data=json.dumps(package),
                 headers={'Content-Type': 'application/json'})


if __name__ == '__main__':
    send_packages()