from flask import Flask, render_template, jsonify
import pandas as pd
import json

app = Flask(__name__)

# Paths para datos de red de profesores
FACULTY_NODES_PATH = "data/faculty_network_filtered.json"
FACULTY_EDGES_PATH = "data/faculty_edges.csv"

@app.route('/')
def hello_world():
    return render_template('index.html')

# Endpoints para los nuevos CSVs procesados

@app.route('/api/faculty_nodes')
def get_faculty_nodes():
    """Endpoint para obtener datos de nodos de profesores (JSON)"""
    try:
        with open(FACULTY_NODES_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data['nodes'])
    except FileNotFoundError:
        return jsonify({"error": "Archivo faculty_network_filtered.json no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Error leyendo archivo JSON: {str(e)}"}), 500

@app.route('/api/faculty_edges')
def get_faculty_edges():
    """Endpoint para obtener datos de enlaces entre profesores (CSV)"""
    try:
        df = pd.read_csv(FACULTY_EDGES_PATH)
        return jsonify(df.to_dict(orient='records'))
    except FileNotFoundError:
        return jsonify({"error": "Archivo faculty_edges.csv no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Error leyendo archivo CSV: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)