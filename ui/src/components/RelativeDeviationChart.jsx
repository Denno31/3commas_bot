import React, { useState, useEffect } from 'react';
import { fetchBotDeviations } from '../api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { Alert, Card, Form, Row, Col, Spinner, Tabs, Tab } from 'react-bootstrap';

const COLORS = [
  '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#3B3EAC', '#0099C6',
  '#DD4477', '#66AA00', '#B82E2E', '#316395', '#994499', '#22AA99', '#AAAA11'
];

/**
 * Component for displaying relative deviation charts
 */
const RelativeDeviationChart = ({ botId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deviationData, setDeviationData] = useState(null);
  // 0 = time series, 1 = heatmap
  const [baseCoin, setBaseCoin] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  // Time range options in milliseconds
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  useEffect(() => {
    if (!botId) return;
    
    const loadDeviations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const fromDate = new Date(Date.now() - timeRanges[timeRange]);
        
        const options = {
          from: fromDate,
          to: new Date(),
          baseCoin: baseCoin || undefined
        };
        
        const result = await fetchBotDeviations(botId, options);
        if (result.success) {
          setDeviationData(result);
        } else {
          setError('Failed to load deviation data');
        }
      } catch (err) {
        console.error('Error loading deviations:', err);
        setError(err.message || 'Failed to load deviation data');
      } finally {
        setLoading(false);
      }
    };
    
    loadDeviations();
  }, [botId, timeRange, baseCoin]);

  // Updated to work with React Bootstrap Tabs
  const setDisplayType = (tabValue) => {
    setTabDisplayType(tabValue);
  };
  
  // Renamed to avoid naming conflict with the function
  const [tabDisplayType, setTabDisplayType] = useState(0);

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleBaseCoinChange = (event) => {
    setBaseCoin(event.target.value);
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <Spinner animation="border" />
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4">
        <Card.Body>
          <Alert variant="danger">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!deviationData) {
    return (
      <Card className="mb-4">
        <Card.Body>
          <Alert variant="info">No deviation data available</Alert>
        </Card.Body>
      </Card>
    );
  }

  // Helper function to format deviation values for display
  const formatDeviation = (value) => {
    // Convert to percentage with 2 decimal places
    return `${(value * 100).toFixed(2)}%`;
  };

  const renderLineChart = () => {
    const { timeSeriesData, coins } = deviationData;
    
    // If baseCoin is selected, only show data for that base
    // Limit the number of lines shown to prevent overcrowding (max 5 lines)
    let dataToShow = {};
    const keysToShow = baseCoin 
      ? Object.keys(timeSeriesData).filter(key => key.startsWith(`${baseCoin}_`))
      : Object.keys(timeSeriesData);
    
    // Take at most 5 pairs to avoid chart clutter
    const limitedKeys = keysToShow.slice(0, 5);
    limitedKeys.forEach(key => {
      dataToShow[key] = timeSeriesData[key];
    });
    
    // No data to display
    if (Object.keys(dataToShow).length === 0) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <p className="text-muted">
            No data available for the selected filters
          </p>
        </div>
      );
    }

    // Format data for line chart
    const formattedData = [];
    const pairKeys = Object.keys(dataToShow);
    
    // Get all timestamps from all pairs
    const allTimestamps = new Set();
    pairKeys.forEach(key => {
      dataToShow[key].forEach(point => {
        allTimestamps.add(new Date(point.timestamp).getTime());
      });
    });
    
    // Convert to array and sort
    const timestamps = Array.from(allTimestamps).sort();
    
    // Create formatted data with all timestamps
    timestamps.forEach(timestamp => {
      const dataPoint = { timestamp };
      
      pairKeys.forEach(key => {
        const point = dataToShow[key].find(p => 
          new Date(p.timestamp).getTime() === timestamp
        );
        if (point) {
          dataPoint[key] = point.deviationPercent;
        }
      });
      
      formattedData.push(dataPoint);
    });

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={formattedData} margin={{ top: 10, right: 30, left: 40, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp"
            interval="preserveStartEnd"
            minTickGap={50}
            tickFormatter={(timestamp) => {
              const date = new Date(timestamp);
              // Different format based on time range
              if (timeRange === '1h' || timeRange === '6h') {
                return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
              } else if (timeRange === '12h' || timeRange === '24h') {
                return `${date.getHours()}:00`;
              } else {
                return `${date.getMonth()+1}/${date.getDate()}`;
              }
            }}
            label={{ value: "Time", position: "insideBottomRight", offset: 0 }}
          />
          <YAxis 
            label={{ value: "Deviation %", angle: -90, position: "insideLeft" }}
            tickFormatter={(value) => formatDeviation(value)}
            domain={['dataMin', 'dataMax']}
          />
          <Tooltip 
            formatter={(value) => [formatDeviation(value), 'Deviation']}
            labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
          />
          <Legend />
          {pairKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key.replace('_', ' → ')}
              stroke={COLORS[index % COLORS.length]}
              dot={false}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderHeatmap = () => {
    const { latestDeviations, coins } = deviationData;
    
    if (!coins || coins.length === 0 || !latestDeviations) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <p className="text-muted">
            No data available for heatmap visualization
          </p>
        </div>
      );
    }
    
    // Filter if baseCoin is selected
    const coinsToShow = baseCoin 
      ? coins.filter(coin => coin === baseCoin || latestDeviations[baseCoin][coin] !== null)
      : coins;
      
    // Transform data for heatmap visualization
    const heatmapData = [];
    
    coinsToShow.forEach(base => {
      if (baseCoin && base !== baseCoin) return;
      
      coinsToShow.forEach(target => {
        if (base === target) return;  // Skip same coin pairs
        
        const deviation = latestDeviations[base][target];
        if (deviation === null) return;  // Skip pairs with no data
        
        heatmapData.push({
          x: base,
          y: target,
          z: Math.abs(deviation),  // Size based on magnitude
          value: deviation,         // Actual value for color
          pair: `${base} → ${target}`,
        });
      });
    });
    
    // Color scale function - green for negative (good buying opportunity), red for positive
    const getColor = (value) => {
      if (value < -10) return '#1a9641';      // Dark green (strong negative)
      if (value < -5) return '#a6d96a';       // Light green (moderate negative)
      if (value < 0) return '#dff7ca';        // Very light green (slight negative)
      if (value === 0) return '#f7f7f7';      // White (neutral)
      if (value < 5) return '#fdcecb';        // Very light red (slight positive)
      if (value < 10) return '#fc8d59';       // Light red (moderate positive)
      return '#d73027';                       // Dark red (strong positive)
    };

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="category" 
            dataKey="x" 
            name="Base Coin" 
            allowDuplicatedCategory={false} 
          />
          <YAxis 
            type="category" 
            dataKey="y" 
            name="Target Coin" 
            allowDuplicatedCategory={false} 
          />
          <ZAxis 
            type="number" 
            dataKey="z" 
            range={[50, 500]} 
            name="Magnitude" 
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value, name, props) => {
              if (name === 'Pair') return [props.payload.pair];
              return [formatDeviation(props.payload.value), 'Deviation'];
            }}
          />
          <Legend />
          <Scatter 
            name="Coin Pairs" 
            data={heatmapData} 
            fill="#8884d8"
          >
            {heatmapData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.value)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <h5 className="mb-3">Relative Deviation Chart</h5>
        {baseCoin && tabDisplayType === 0 && (
          <div className="mb-3">
            <Alert variant="info" className="py-2">
              <small>Showing up to 5 coin pairs to improve readability</small>
            </Alert>
          </div>
        )}
        
        <div className="mb-4">
          <Row>
            <Col xs={12} sm={6} md={4} className="mb-3">
              <Form.Group>
                <Form.Label>Time Range</Form.Label>
                <Form.Select 
                  value={timeRange}
                  onChange={handleTimeRangeChange}
                  size="sm"
                >
                  <option value="1h">Last Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="12h">Last 12 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="3d">Last 3 Days</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </Form.Select>
              </Form.Group>
            </Col>
            
            <Col xs={12} sm={6} md={4}>
              <Form.Group>
                <Form.Label>Base Coin</Form.Label>
                <Form.Select
                  value={baseCoin}
                  onChange={handleBaseCoinChange}
                  size="sm"
                >
                  <option value="">All Coins</option>
                  {deviationData.coins.map(coin => (
                    <option key={coin} value={coin}>
                      {coin}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </div>
        
        <div className="mb-4">
          <Tabs 
            activeKey={tabDisplayType} 
            onSelect={(k) => setTabDisplayType(Number(k))}
            variant="tabs"
            className="mb-3"
          >
            <Tab eventKey={0} title="Time Series" />
            <Tab eventKey={1} title="Heatmap" />
          </Tabs>
        </div>
        
        {tabDisplayType === 0 ? renderLineChart() : renderHeatmap()}
        
        <div className="mt-3">
          <p className="text-muted small">
            The chart shows relative deviations between coin pairs, helping identify potential trade opportunities.
            Negative values indicate the target coin is underperforming the base coin and might be a good purchase candidate.
          </p>
        </div>
      </Card.Body>
    </Card>
  );
};

export default RelativeDeviationChart;
