function createNetworkGraph(containerId) {
  // Limpiar el contenedor
  d3.select(containerId).selectAll('*').remove();
  
  // Obtener dimensiones del contenedor
  const container = document.querySelector(containerId);
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 60, right: 20, bottom: 20, left: 20 };
  
  // Crear contenedor principal
  const mainContainer = d3.select(containerId)
    .append('div')
    .style('position', 'relative')
    .style('width', '100%')
    .style('height', '100%');
  
  // Crear SVG
  const svg = mainContainer
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', 'radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)');
    
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
    
  // Crear controles de interfaz
  const controls = mainContainer
    .append('div')
    .style('position', 'absolute')
    .style('top', '10px')
    .style('left', '10px')
    .style('z-index', '1000')
    .style('background', 'rgba(255,255,255,0.95)')
    .style('padding', '15px')
    .style('border-radius', '8px')
    .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
    .style('font-family', 'sans-serif');
  
  // Título mejorado con gradiente
  const titleGroup = svg.append('g');
  
  const titleGradient = svg.append('defs')
    .append('linearGradient')
    .attr('id', 'titleGradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%');
    
  titleGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', '#0b3b66');
    
  titleGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', '#2563eb');
  
  titleGroup.append('text')
    .attr('x', width / 2)
    .attr('y', 35)
    .attr('text-anchor', 'middle')
    .style('font-size', '28px')
    .style('font-weight', 'bold')
    .style('fill', 'url(#titleGradient)')
    .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.3)')
    .text('Red de Colaboración Académica - Profesores UTEC');

  // Crear definiciones para patrones y filtros
  const defs = svg.append('defs');
  
  const weightedLinkColor = '#2563eb';
  const departmentLinkColor = '#94a3b8';
  // Configuración de la simulación de fuerzas (parámetros fijos para mantener estabilidad)
  const collisionForce = d3.forceCollide()
  .radius(d => d.radius + 4)
  .iterations(2);

  const simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(d => 150 - (d.weight * 100)))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', collisionForce)
    .alphaDecay(0.02); // Hacer que la simulación se estabilice más rápido

  // Escalas para el tamaño y color de los nodos
  const nodeScale = d3.scaleLinear()
    .range([20, 40]);
    
  const linkScale = d3.scaleLinear()
    .range([1, 8]);
    
  // Escala de colores para departamentos (usando más colores distintivos)
  const departmentColorScale = d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemeSet3).concat(d3.schemePaired));

  // Cargar datos de forma paralela
  Promise.all([
    fetch('/api/faculty_nodes').then(r => r.json()),
    fetch('/api/faculty_edges').then(r => r.json()),
    fetch('/api/faculty_department_edges').then(r => r.json())
  ]).then(([nodesData, edgesData, edgesDepartment]) => {
    
    console.log('Nodes loaded:', nodesData.length);
    console.log('Edges loaded:', edgesData.length);
    console.log('Department Edges loaded:', edgesDepartment.length);

    // Obtener departamentos únicos y configurar escala de colores
    const departments = [...new Set(nodesData.map(d => d.department))];
    departmentColorScale.domain(departments);
    
    const nodeConnections = {};
    edgesData.forEach(edge => {
      nodeConnections[edge.source_id] = (nodeConnections[edge.source_id] || 0) + 1;
      nodeConnections[edge.target_id] = (nodeConnections[edge.target_id] || 0) + 1;
    });
    
    // Procesar nodos con métricas mejoradas
    const nodes = nodesData.map(d => {
      const connections = nodeConnections[d.id] || 0;
      const influence = (d.citations * 0.7) + (connections * 0.3);
      
      return {
        ...d,
        connections: connections,
        influence: influence,
        radius: Math.max(15, Math.min(45, 15 + Math.sqrt(influence) * 2)),
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100
      };
    });
    const nodesById = new Map(nodes.map(node => [node.id, node]));
    
    const minWeight = 0.65;
    const links = edgesData
      .filter(d => d.weight >= minWeight)
      .map(d => ({
        ...d,
        source: d.source_id,
        target: d.target_id
      }));
      
    console.log('Filtered links:', links.length);
    
    // Actualizar escalas con los datos reales
    const linkExtent = d3.extent(links, d => d.weight);
    if (linkExtent[0] != null) {
      linkScale.domain(linkExtent);
    }
    
    const departmentLinks = edgesDepartment
      .map(d => {
        const source = nodesById.get(d.source_id);
        const target = nodesById.get(d.target_id);
        return (source && target) ? { ...d, source, target } : null;
      })
      .filter(Boolean);
    
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
    const departmentLink = g.append('g')
      .attr('class', 'department-links')
      .selectAll('line')
      .data(departmentLinks)
      .enter().append('line')
      .attr('stroke', departmentLinkColor)
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 1.5);
    
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', weightedLinkColor)
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
        const connections = nodeConnections[d.id] || 0;
        tooltip.style('visibility', 'visible')
          .html(`
            <strong>${d.name}</strong><br/>
            <strong>Departamento:</strong> ${d.department}<br/>
            <strong>Email:</strong> ${d.email}<br/>
            <strong>Citas:</strong> ${d.citations}<br/>
            <strong>Conexiones:</strong> ${connections}<br/>
            <strong>Áreas de investigación:</strong> ${d.research_areas.substring(0, 150)}...
          `);
        
        // Resaltar nodo y sus conexiones
        d3.select(this)
          .attr('stroke', '#ff6b6b')
          .attr('stroke-width', 4);
          
        // Resaltar enlaces conectados
        link
          .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#ff6b6b' : weightedLinkColor)
          .attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.3);
        departmentLink
          .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#f97316' : departmentLinkColor)
          .attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 0.9 : 0.15);
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
          .attr('stroke', weightedLinkColor)
          .attr('stroke-opacity', 0.6);
        departmentLink
          .attr('stroke', departmentLinkColor)
          .attr('stroke-opacity', 0.25);
      });
    
    // Controles de filtro por departamento
    const filterContainer = controls.append('div')
      .style('margin-bottom', '10px');
    filterContainer.append('label')
      .style('display', 'block')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('margin-bottom', '4px')
      .text('Filtrar por departamento:');
    const departmentSelect = filterContainer.append('select')
      .style('width', '200px')
      .style('padding', '6px')
      .style('border', '1px solid #d1d5db')
      .style('border-radius', '4px')
      .on('change', function() { filterByDepartment(this.value); });
    departmentSelect.append('option')
      .attr('value', 'all')
      .text('Todos');
    departments.forEach(department => {
      departmentSelect.append('option')
        .attr('value', department)
        .text(department);
    });
    
    function filterByDepartment(department) {
      const allowedNodes = department === 'all'
        ? nodes
        : nodes.filter(n => n.department === department);
      const allowedIds = new Set(allowedNodes.map(n => n.id));
      
      if (department === 'all') {
        node.style('display', null);
        labels.style('display', null);
        link.style('display', null);
        departmentLink.style('display', null);
      } else {
        node.style('display', d => allowedIds.has(d.id) ? null : 'none');
        labels.style('display', d => allowedIds.has(d.id) ? null : 'none');
        link.style('display', d => (allowedIds.has(d.source.id) && allowedIds.has(d.target.id)) ? null : 'none');
        departmentLink.style('display', d => (allowedIds.has(d.source.id) && allowedIds.has(d.target.id)) ? null : 'none');
      }
      
      if (allowedNodes.length) {
        allowedNodes.forEach(n => {
          n.x = width / 2;
          n.y = height / 2;
          n.vx = 0;
          n.vy = 0;
          n.fx = width / 2;
          n.fy = height / 2;
        });
        
        simulation.alpha(0.9).restart();
        
        setTimeout(() => {
          allowedNodes.forEach(n => {
            n.fx = null;
            n.fy = null;
          });
        }, 400);
      }
    }
    
    // Iniciar simulación
    simulation
      .nodes(nodes)
      .on('tick', ticked);
    
    simulation.force('link')
      .links(links);
    
    function ticked() {
      departmentLink
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
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
    
    // Controles de zoom mejorados
    const zoom = d3.zoom()
      .scaleExtent([0.1, 8])
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
      .attr('transform', `translate(20, ${height - 140})`);
      
    legend.append('rect')
      .attr('width', 210)
      .attr('height', 120)
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
      .text('• Línea azul = Similitud (con peso)');
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 70)
      .style('font-size', '12px')
      .text('• Línea gris = Mismo departamento');
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 85)
      .style('font-size', '12px')
      .text('• Borde del nodo = Departamento');
      
    legend.append('text')
      .attr('x', 10)
      .attr('y', 100)
      .style('font-size', '12px')
      .text('• Hover para más información');
    
    // Leyenda de departamentos
    const departmentLegend = svg.append('g')
      .attr('class', 'department-legend')
      .attr('transform', `translate(20, 130)`);
    
    // Calcular altura necesaria para la leyenda de departamentos
    const maxDepartmentsToShow = Math.min(departments.length, 12); // Limitar para no ocupar toda la pantalla
    const legendHeight = maxDepartmentsToShow * 20 + 40;
    
    departmentLegend.append('rect')
      .attr('width', 230)
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