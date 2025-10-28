function createCorrelation() {
  // Limpiar el contenedor
  d3.select('#Correlation').selectAll('*').remove();
  
  // Obtener dimensiones del div contenedor
  const container = document.getElementById('Correlation');
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 70, right: 50, bottom: 50, left: 100 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  function reduce_string(str, maxLength) {
    return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str;
  }

  // Crear SVG
  const svg = d3.select('#Correlation')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Cargar datos de correlación
  fetch('/correlation_task1')
    .then(response => response.json())
    .then(data => {
      const columns = data.columns;
      const values = data.data;
      
      // Crear matriz de correlación
      const correlationMatrix = [];
      for (let i = 0; i < columns.length; i++) {
        for (let j = 0; j < columns.length; j++) {
          correlationMatrix.push({
            x: columns[i],
            y: columns[j],
            value: values[i][j]
          });
        }
      }

      // Escalas
      const xScale = d3.scaleBand()
        .domain(columns)
        .range([0, innerWidth])
        .padding(0.1);

      const yScale = d3.scaleBand()
        .domain(columns)
        .range([0, innerHeight])
        .padding(0.1);

      const colorScale = d3.scaleSequential(d3.interpolateRdBu)
        .domain([1, -1]); // Correlación va de -1 a 1

      // Crear celdas de la matriz
      g.selectAll('rect')
        .data(correlationMatrix)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.x))
        .attr('y', d => yScale(d.y))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', 'white')
        .attr('stroke-width', 1);

      // Agregar texto con valores de correlación
      g.selectAll('text.correlation-text')
        .data(correlationMatrix)
        .enter()
        .append('text')
        .attr('class', 'correlation-text')
        .attr('x', d => xScale(d.x) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.y) + yScale.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('fill', d => Math.abs(d.value) > 0.5 ? 'white' : 'black')
        .text(d => d.value.toFixed(2));

      // Agregar ejes
      g.append('g')
        .selectAll('text.x-label')
        .data(columns)
        .enter()
        .append('text')
        .attr('class', 'x-label')
        .attr('x', d => xScale(d) + xScale.bandwidth() / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text(d => reduce_string(d, 7));

      g.append('g')
        .selectAll('text.y-label')
        .data(columns)
        .enter()
        .append('text')
        .attr('class', 'y-label')
        .attr('x', -5)
        .attr('y', d => yScale(d) + yScale.bandwidth() / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '14px')
        .text(d =>  d);

      // Título
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text('Correlation Matrix');
    })
    .catch(error => {
      console.error('Error loading correlation data:', error);
    });
}
