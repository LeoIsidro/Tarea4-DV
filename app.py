from flask import Flask, render_template, jsonify
import pandas as pd
import json

app = Flask(__name__)

# Paths de los nuevos CSVs procesados
CSV_PATH_BY_YEAR = "data/data_with_year_features.csv"
CSV_PATH_BY_GENRE = "data/data_by_genres.csv"
CSV_PATH_DATA_DECADA = "data/data_with_decades.csv"

# Paths para datos de red de profesores
FACULTY_NODES_PATH = "data/faculty_network_filtered.json"
FACULTY_EDGES_PATH = "data/faculty_edges.csv"

def read_csv(csv_path):
    return pd.read_csv(csv_path)

def selected_columns(df, columns):
    for col in columns:
        if col not in df.columns:
            raise ValueError(f"La columna {col} no existe en el DataFrame")
    return df[columns]

def get_sample(df, n):
    return df.sample(n)

@app.route('/')
def hello_world():
    return render_template('index.html')

# Endpoints para los nuevos CSVs procesados

@app.route('/api/data_by_year')
def get_data_by_year():
    """Endpoint para datos por año (Pregunta 1)"""
    try:
        df = read_csv(CSV_PATH_BY_YEAR)
        columns_to_select = ['valence', 'year', 'acousticness', 'danceability', 'energy', 'explicit', 'instrumentalness',  'loudness', 'popularity', 'speechiness']
        df = selected_columns(df, columns_to_select)
        df = get_sample(df, 1000)
        return jsonify(df.to_dict(orient='records'))
    except FileNotFoundError:
        return jsonify({"error": "Archivo no encontrado. Ejecuta procesar.py primero"}), 404

@app.route('/correlation_task1')
def correlation_task_1():
    try:
        df = read_csv(CSV_PATH_BY_YEAR)
        columns_to_select = ['valence', 'acousticness', 'danceability', 'energy', 'explicit', 'instrumentalness',  'loudness', 'popularity', 'speechiness']
        df = selected_columns(df, columns_to_select)
        corr_matrix = df.corr(method='pearson')
        return corr_matrix.to_json(orient='split')
    except FileNotFoundError:
        return jsonify({"error": "Archivo no encontrado. Ejecuta procesar.py primero"}), 404

@app.route('/api/data_by_genre')
def get_data_by_genre():
    """Endpoint para datos por género (Pregunta 2)"""
    try:
        df = read_csv(CSV_PATH_BY_GENRE)
        # Incluir la columna 'genres' para poder colorear por género
        columns_to_select = ['genres', 'valence', 'acousticness', 'danceability', 'energy', 'instrumentalness', 'loudness', 'popularity', 'speechiness']
        df = selected_columns(df, columns_to_select)
        df = get_sample(df, 10)  # Aumentado el sample para mejor diversidad
        return jsonify(df.to_dict(orient='records'))
    except FileNotFoundError:
        return jsonify({"error": "Archivo no encontrado. Ejecuta procesar.py primero"}), 404

@app.route('/api/data')
def get_data():

    try:
        df = read_csv(CSV_PATH_DATA_DECADA)
        # Incluir la columna 'genres' para poder colorear por género
        columns_to_select = ['decada', 'valence', 'acousticness', 'danceability', 'energy', 'instrumentalness', 'loudness', 'popularity', 'speechiness']
        df = selected_columns(df, columns_to_select)
        return jsonify(df.to_dict(orient='records'))
    except FileNotFoundError:
        return jsonify({"error": "Archivo no encontrado. Ejecuta procesar.py primero"}), 404

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