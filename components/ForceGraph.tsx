import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CreativeNode, CreativeLink, GraphData, NodeType, Category } from '../types';
import { categoryColors } from '../data/creativityOntology';

interface ForceGraphProps {
  data: GraphData;
  selectedNode: CreativeNode | null;
  onNodeClick: (node: CreativeNode | null) => void;
}

interface TooltipState {
  visible: boolean;
  content: CreativeNode | null;
  x: number;
  y: number;
}

const ForceGraph: React.FC<ForceGraphProps> = ({ data, selectedNode, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, content: null, x: 0, y: 0 });
  const hideTooltipTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const svg = d3.select(svgRef.current);
    
    // Initial setup if svg is empty
    if (svg.select("g.zoom-group").empty()) {
        svg.attr('width', width)
          .attr('height', height)
          .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '));
        const zoomGroup = svg.append("g").attr("class", "zoom-group");
        zoomGroup.append("g").attr("class", "links-group");
        zoomGroup.append("g").attr("class", "nodes-group");
    }

    const zoomGroup = svg.select<SVGGElement>(".zoom-group");
    const linksGroup = zoomGroup.select<SVGGElement>(".links-group");
    const nodesGroup = zoomGroup.select<SVGGElement>(".nodes-group");
    
    const nodes: CreativeNode[] = data.nodes.map(d => ({...d}));
    const links: d3.SimulationLinkDatum<CreativeNode>[] = data.links.map(d => ({...d}));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink<CreativeNode, CreativeLink>(links).id(d => d.id).distance(d => d.source.type === NodeType.Discipline && d.target.type === NodeType.Discipline ? 120 : 60))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    const link = linksGroup.selectAll<SVGLineElement, CreativeLink>("line.link")
      .data(links, d => `${(d.source as CreativeNode).id}-${(d.target as CreativeNode).id}`)
      .join("line")
      .attr("class", "link")
      .attr("stroke", "#5e5e5e")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5);

    const node = nodesGroup.selectAll<SVGGElement, CreativeNode>("g.node")
      .data(nodes, d => d.id)
      .join(
        enter => {
          const g = enter.append("g").attr("class", "node");
          g.append("circle")
            .attr("r", d => d.type === NodeType.Discipline ? 16 : 8)
            .attr("fill", d => categoryColors[d.category] || '#6b7280')
            .attr("stroke-width", 2);
          g.append("text")
            .text(d => d.id)
            .attr("x", d => d.type === NodeType.Discipline ? 20 : 12)
            .attr("y", 5)
            .attr("fill", "#e5e7eb")
            .style("font-size", "12px")
            .style("pointer-events", "none");
          return g;
        }
      )
      .call(drag(simulation));
      
    // Update selection highlight
    node.select('circle')
        .attr('stroke', d => d.id === selectedNode?.id ? 'white' : '#1f2937')
        .attr('stroke-width', d => d.id === selectedNode?.id ? 4 : 2);

    const handleMouseOver = (event: MouseEvent, d: CreativeNode) => {
      if (hideTooltipTimeout.current) {
        clearTimeout(hideTooltipTimeout.current);
        hideTooltipTimeout.current = null;
      }
      setTooltip({ visible: true, content: d, x: event.pageX + 15, y: event.pageY });
    };

    const handleMouseMove = (event: MouseEvent) => {
      setTooltip(prev => ({ ...prev, x: event.pageX + 15, y: event.pageY }));
    };

    const handleMouseOut = () => {
      hideTooltipTimeout.current = window.setTimeout(() => {
        setTooltip({ visible: false, content: null, x: 0, y: 0 });
      }, 300);
    };
    
    node.on('mouseover', handleMouseOver)
      .on('mousemove', handleMouseMove)
      .on('mouseout', handleMouseOut)
      .on('click', (event, d) => {
          event.stopPropagation();
          onNodeClick(d);
      });

    svg.on('click', () => {
        onNodeClick(null);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as CreativeNode).x!)
        .attr("y1", d => (d.source as CreativeNode).y!)
        .attr("x2", d => (d.target as CreativeNode).x!)
        .attr("y2", d => (d.target as CreativeNode).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    if (!svg.property('__zoom')) {
        const zoomHandler = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                zoomGroup.attr("transform", event.transform);
            });
        svg.call(zoomHandler);
    }

    function drag(simulation: d3.Simulation<CreativeNode, undefined>) {
        function dragstarted(event: d3.D3DragEvent<Element, CreativeNode, CreativeNode>, d: CreativeNode) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }
        function dragged(event: d3.D3DragEvent<Element, CreativeNode, CreativeNode>, d: CreativeNode) {
          d.fx = event.x;
          d.fy = event.y;
        }
        function dragended(event: d3.D3DragEvent<Element, CreativeNode, CreativeNode>, d: CreativeNode) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }
        return d3.drag<SVGGElement, CreativeNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended);
    }
    
    const resizeObserver = new ResizeObserver(entries => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) {
          return;
        }
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (svgRef.current) {
            d3.select(svgRef.current)
              .attr('width', width)
              .attr('height', height)
              .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '));
          }
        }
      });
    });

    resizeObserver.observe(container);

    return () => {
      simulation.stop();
      resizeObserver.disconnect();
      if (svgRef.current) {
        d3.select(svgRef.current).on('click', null);
      }
    };
  }, [data, selectedNode, onNodeClick]);

  const handleTooltipEnter = () => {
    if (hideTooltipTimeout.current) {
      clearTimeout(hideTooltipTimeout.current);
      hideTooltipTimeout.current = null;
    }
  };

  const handleTooltipLeave = () => {
    setTooltip({ visible: false, content: null, x: 0, y: 0 });
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef}></svg>
      {tooltip.visible && tooltip.content && !selectedNode && (
        <div 
          className="absolute p-3 rounded-md bg-gray-900 border border-gray-700 text-white text-sm shadow-lg max-w-xs z-20"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, pointerEvents: 'auto' }}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <h3 className="font-bold text-base mb-1" style={{ color: categoryColors[tooltip.content.category] }}>
            {tooltip.content.id}
          </h3>
          <p className="text-xs text-gray-400 mb-2">
            <strong>{tooltip.content.type}</strong> | {tooltip.content.era || tooltip.content.phase}
          </p>
          <p className="text-gray-300">{tooltip.content.description}</p>
          {tooltip.content.exampleUrl && (
            <a 
              href={tooltip.content.exampleUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:text-blue-300 underline mt-2 block"
            >
              Learn more
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default ForceGraph;