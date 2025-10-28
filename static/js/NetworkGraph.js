function createNetworkGraph(containerId) {
  // Limpiar el contenedor
  d3.select(containerId).selectAll('*').remove();
  
  // Obtener dimensiones del contenedor
  const container = document.querySelector(containerId);
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  
  // Crear SVG
  const svg = d3.select(containerId)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
    
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
    
  // Agregar título
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .style('font-size', '24px')
    .style('font-weight', 'bold')
    .style('fill', '#0b3b66')
    .text('Red de Colaboración Académica - Profesores UTEC');

  // Crear definiciones para patrones de imagen
  const defs = svg.append('defs');
  
  // Configuración de la simulación de fuerzas (parámetros fijos para mantener estabilidad)
  const simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(d => 150 - (d.weight * 100)))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(35))
    .alphaDecay(0.02); // Hacer que la simulación se estabilice más rápido

  // Escalas para el tamaño y color de los nodos
  const nodeScale = d3.scaleLinear()
    .range([20, 40]);
    
  const linkScale = d3.scaleLinear()
    .range([1, 8]);
    
  // Escala de colores para departamentos (usando más colores distintivos)
  const departmentColorScale = d3.scaleOrdinal([
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
    '#c49c94', '#f7b6d3', '#c7c7c7', '#dbdb8d', '#9edae5'
  ]);

  // Cargar datos de forma paralela
  Promise.all([
    fetch('/api/faculty_nodes').then(r => r.json()),
    fetch('/api/faculty_edges').then(r => r.json())
  ]).then(([nodesData, edgesData]) => {
    
    console.log('Nodes loaded:', nodesData.length);
    console.log('Edges loaded:', edgesData.length);
    
    // Obtener departamentos únicos y configurar escala de colores
    const departments = [...new Set(nodesData.map(d => d.department))];
    departmentColorScale.domain(departments);
    
    // Procesar nodos con posiciones iniciales determinísticas para evitar reorganización
    const nodes = nodesData.map(d => {
      // Generar posiciones iniciales basadas en el ID para consistencia
      const angle = (d.id * 137.508) % 360; // Golden angle para distribución uniforme
      const radius = 200 + (d.id % 3) * 100;
      const x = (width / 2) + radius * Math.cos(angle * Math.PI / 180);
      const y = (height / 2) + radius * Math.sin(angle * Math.PI / 180);
      
      return {
        ...d,
        radius: nodeScale.domain(d3.extent(nodesData, n => n.citations))(d.citations) || 25,
        x: x,
        y: y
      };
    });
    
    // Procesar enlaces (filtrar por peso mínimo para mejor visualización)
    const minWeight = 0.65; // Solo mostrar conexiones fuertes
    const links = edgesData
      .filter(d => d.weight >= minWeight)
      .map(d => ({
        ...d,
        source: d.source_id,
        target: d.target_id
      }));
      
    console.log('Filtered links:', links.length);
    
    // Actualizar escalas con los datos reales
    nodeScale.domain(d3.extent(nodes, d => d.citations));
    linkScale.domain(d3.extent(links, d => d.weight));
    
    // Crear patrones de imagen para cada profesor
    nodes.forEach(node => {
      const pattern = defs.append('pattern')
        .attr('id', `image-${node.id}`)
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 1)
        .attr('height', 1)
        .attr('patternContentUnits', 'objectBoundingBox');
        
      pattern.append('image')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 1)
        .attr('height', 1)
        .attr('preserveAspectRatio', 'xMidYMid slice')
        .attr('href', node.image_url)
        .on('error', function() {
          // Si la imagen falla, usar un color sólido
          d3.select(this.parentNode).remove();
          defs.append('pattern')
            .attr('id', `image-${node.id}`)
            .attr('width', 1)
            .attr('height', 1)
            .append('rect')
            .attr('width', 1)
            .attr('height', 1)
            .attr('fill', departmentColorScale(node.department));
        });
    });
    
    // Crear enlaces
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => linkScale(d.weight));
    
    // Crear nodos
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => `url(#image-${d.id})`)
      .attr('stroke', d => departmentColorScale(d.department))
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));
    
    // Agregar etiquetas de nombres (solo para nodos importantes)
    const labels = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes.filter(d => d.citations > 50)) // Solo mostrar nombres de profesores con más citas
      .enter().append('text')
      .text(d => d.name.split(' ').slice(0, 2).join(' ')) // Mostrar solo primeros dos nombres
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none');
    
    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'network-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '10px')
      .style('border-radius', '5px')
      .style('font-size', '12px')
      .style('max-width', '300px')
      .style('z-index', '1000');
    
    // Eventos del mouse para el tooltip
    node
      .on('mouseover', function(event, d) {
        tooltip.style('visibility', 'visible')
          .html(`
            <strong>${d.name}</strong><br/>
            <strong>Departamento:</strong> ${d.department}<br/>
            <strong>Email:</strong> ${d.email}<br/>
            <strong>Citas:</strong> ${d.citations}<br/>
            <strong>Áreas de investigación:</strong> ${d.research_areas.substring(0, 150)}...
          `);
        
        // Resaltar nodo y sus conexiones
        d3.select(this)
          .attr('stroke', '#ff6b6b')
          .attr('stroke-width', 4);
          
        // Resaltar enlaces conectados
        link
          .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#ff6b6b' : '#999')
          .attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.3);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('top', (event.pageY + 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        tooltip.style('visibility', 'hidden');
        
        // Restaurar estilo original
        d3.select(this)
          .attr('stroke', d => departmentColorScale(d.department))
          .attr('stroke-width', 3);
          
        // Restaurar enlaces
        link
          .attr('stroke', '#999')
          .attr('stroke-opacity', 0.6);
      });
    
    // Iniciar simulación
    simulation
      .nodes(nodes)
      .on('tick', ticked);
    
    simulation.force('link')
      .links(links);
    
    function ticked() {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
        
      labels
        .attr('x', d => d.x)
        .attr('y', d => d.y + d.radius + 15);
    }
    
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Controles de zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', function(event) {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);
      
    svg.select('.zoom-controls')
      .append('text')
      .attr('x', 40)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text('Centrar');
    
    // Leyenda de información general
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(20, ${height - 120})`);
      
    legend.append('rect')
      .attr('width', 180)
      .attr('height', 100)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', '#333')
      .attr('rx', 5);
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Información:');
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 40)
      .style('font-size', '12px')
      .text('• Tamaño = Número de citas');
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 55)
      .style('font-size', '12px')
      .text('• Grosor línea = Similitud');
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 70)
      .style('font-size', '12px')
      .text('• Color borde = Departamento');
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 85)
      .style('font-size', '12px')
      .text('• Hover para más información');
    
    // Leyenda de departamentos
    const departmentLegend = svg.append('g')
      .attr('class', 'department-legend')
      .attr('transform', `translate(${width - 320}, 60)`);
    
    // Calcular altura necesaria para la leyenda de departamentos
    const maxDepartmentsToShow = Math.min(departments.length, 12); // Limitar para no ocupar toda la pantalla
    const legendHeight = maxDepartmentsToShow * 20 + 40;
    
    departmentLegend.append('rect')
      .attr('width', 300)
      .attr('height', legendHeight)
      .attr('fill', 'rgba(255, 255, 255, 0.95)')
      .attr('stroke', '#333')
      .attr('rx', 5);
      
    departmentLegend.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Departamentos:');
    
    // Solo mostrar los departamentos más relevantes (con más profesores)
    const departmentCounts = {};
    departments.forEach(dept => {
      departmentCounts[dept] = nodes.filter(n => n.department === dept).length;
    });
    
    const sortedDepartments = departments
      .sort((a, b) => departmentCounts[b] - departmentCounts[a])
      .slice(0, maxDepartmentsToShow);
    
    const deptItems = departmentLegend.selectAll('.dept-item')
      .data(sortedDepartments)
      .enter().append('g')
      .attr('class', 'dept-item')
      .attr('transform', (d, i) => `translate(10, ${35 + i * 20})`);
    
    deptItems.append('circle')
      .attr('cx', 8)
      .attr('cy', 0)
      .attr('r', 6)
      .attr('fill', 'white')
      .attr('stroke', d => departmentColorScale(d))
      .attr('stroke-width', 3);
    
    deptItems.append('text')
      .attr('x', 20)
      .attr('y', 0)
      .attr('dominant-baseline', 'middle')
      .style('font-size', '11px')
      .style('font-family', 'sans-serif')
      .style('fill', '#333')
      .text(d => {
        // Acortar nombres de departamentos muy largos
        const shortName = d.replace('Departamento de ', '').replace('Departamento ', '');
        return shortName.length > 35 ? shortName.substring(0, 32) + '...' : shortName;
      });
    
  }).catch(error => {
    console.error('Error loading network data:', error);
    
    // Mostrar mensaje de error
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('fill', '#dc3545')
      .text('Error cargando datos de la red académica');
  });
}