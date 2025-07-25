import React, { useState, useEffect } from 'react';
import { fetchBotDeviations } from '../api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { Alert, Card, Form, Row, Col, Spinner, Tabs, Tab, Table } from 'react-bootstrap';

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
          // Ensure we preserve the selected base coin in case of empty data
          if (baseCoin && !result.coins.includes(baseCoin)) {
            // Add the selected coin to the list even if no data is available
            result.coins = [...result.coins, baseCoin];
          }
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
    // Data already comes as percentage values, just format with 2 decimal places
    return `${value.toFixed(2)}%`;
  };

  // Helper function to sample data intelligently based on time range
  const sampleTimeSeriesData = (data, timeRange) => {
    // If there aren't many points, don't sample
    if (data.length <= 100) return data;
    
    // Sample rates based on time range
    const getSampleRate = () => {
      switch(timeRange) {
        case '1h': return 1; // Keep all points for 1 hour
        case '6h': return 2; // Sample every 2nd point
        case '12h': return 3; // Sample every 3rd point
        case '24h': return 5; // Sample every 5th point
        case '3d': return 12; // Sample every 12th point
        case '7d': return 24; // Sample every 24th point
        case '30d': return 60; // Sample every 60th point
        default: return 1;
      }
    };
    
    const sampleRate = getSampleRate();
    
    // Always keep first and last point
    // Sort to ensure chronological order
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    if (sampleRate === 1) return sortedData;
    
    const firstPoint = sortedData[0];
    const lastPoint = sortedData[sortedData.length - 1];
    
    // Find min and max deviation points to preserve important data
    let maxDeviation = -Infinity;
    let minDeviation = Infinity;
    let maxPoint = null;
    let minPoint = null;
    
    sortedData.forEach(point => {
      if (point.deviationPercent > maxDeviation) {
        maxDeviation = point.deviationPercent;
        maxPoint = point;
      }
      if (point.deviationPercent < minDeviation) {
        minDeviation = point.deviationPercent;
        minPoint = point;
      }
    });
    
    // Sample the data
    const sampledData = [];
    sortedData.forEach((point, index) => {
      // Keep points that are important or match the sample rate
      const isImportantPoint = 
        point === firstPoint || 
        point === lastPoint || 
        point === maxPoint || 
        point === minPoint;
        
      if (isImportantPoint || index % sampleRate === 0) {
        sampledData.push(point);
      }
    });
    
    return sampledData;
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
    
    // Apply sampling to each key's data
    limitedKeys.forEach(key => {
      const sampledData = sampleTimeSeriesData(timeSeriesData[key], timeRange);
      dataToShow[key] = sampledData;
    });
    
    // No data to display for the selected coin
    if (Object.keys(dataToShow).length === 0) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <Alert variant="info" className="text-center">
            {baseCoin ? 
              `No deviation data available for ${baseCoin} in the selected time range. Try selecting a different coin or extending the time range.` : 
              'No deviation data available for the selected filters.'}
          </Alert>
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
            formatter={(value, name) => {
              // Parse coin pair from the name (which is the key from dataToShow)
              const coins = name.split('_');
              const fromCoin = coins[0];
              const toCoin = coins[1];
              // Return value with a specific name to avoid undefined
              return [formatDeviation(value), `${fromCoin} → ${toCoin}`, 'Deviation'];
            }}
            labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '4px', border: '1px solid #ddd' }}
            itemStyle={{ padding: '4px 0' }}
          />
          <Legend />
          {pairKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key.replace('_', ' → ')}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 1.5 }}
              connectNulls={true}
              activeDot={{ r: 4, strokeWidth: 1, stroke: '#fff' }}
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
          <Alert variant="info" className="text-center">
            {baseCoin ? 
              `No heatmap data available for ${baseCoin} in the selected time range. Try selecting a different coin or extending the time range.` : 
              'No data available for heatmap visualization.'}
          </Alert>
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
              if (name === 'Pair') {
                // Extract base and target coins
                const baseCoin = props.payload.x;
                const targetCoin = props.payload.y;
                return [`${baseCoin} → ${targetCoin}`, 'Coin Pair', ''];
              }
              return [formatDeviation(props.payload.value), 'Deviation', ''];
            }}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '4px', border: '1px solid #ddd' }}
            itemStyle={{ padding: '4px 0' }}
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

  // New function to render the deviation data table
  const renderDeviationTable = () => {
    const { latestDeviations, timeSeriesData, coins, lastUpdated } = deviationData;
    
    if (!coins || coins.length === 0 || !latestDeviations) {
      return (
        <Alert variant="info">No deviation data available</Alert>
      );
    }
    
    // Create a map of latest price data from timeSeriesData
    const latestPriceData = {};
    
    // Extract the latest price data for each pair from timeSeriesData
    Object.entries(timeSeriesData).forEach(([pairKey, dataPoints]) => {
      if (dataPoints.length > 0) {
        // Get the most recent data point
        const latest = dataPoints[dataPoints.length - 1];
        const { baseCoin, targetCoin, basePrice, targetPrice } = latest;
        
        // Initialize baseCoin entry if needed
        if (!latestPriceData[baseCoin]) {
          latestPriceData[baseCoin] = {};
        }
        
        // Store price data
        latestPriceData[baseCoin][targetCoin] = { basePrice, targetPrice };
      }
    });

    // Filter coins based on selected base coin if specified
    const filteredCoins = baseCoin 
      ? coins.filter(coin => coin === baseCoin || latestDeviations[baseCoin][coin] !== null)
      : coins;
      
    // Generate pairs to show in the table
    const pairs = [];
    
    if (baseCoin) {
      // If a base coin is selected, show all its pairs
      filteredCoins.forEach(targetCoin => {
        if (baseCoin !== targetCoin && latestDeviations[baseCoin][targetCoin] !== null) {
          const pairData = {
            baseCoin: baseCoin,
            targetCoin: targetCoin,
            deviation: latestDeviations[baseCoin][targetCoin],
            timestamp: lastUpdated || new Date() // Use lastUpdated from API or current time as fallback
          };
          
          // Add price data if available
          if (latestPriceData[baseCoin] && latestPriceData[baseCoin][targetCoin]) {
            pairData.basePrice = latestPriceData[baseCoin][targetCoin].basePrice;
            pairData.targetPrice = latestPriceData[baseCoin][targetCoin].targetPrice;
          }
          
          pairs.push(pairData);
        }
      });
    } else {
      // Otherwise show all pairs with non-null deviations
      filteredCoins.forEach(base => {
        filteredCoins.forEach(target => {
          if (base !== target && latestDeviations[base][target] !== null) {
            const pairData = {
              baseCoin: base,
              targetCoin: target,
              deviation: latestDeviations[base][target],
              timestamp: lastUpdated || new Date() // Use lastUpdated from API or current time as fallback
            };
            
            // Add price data if available
            if (latestPriceData[base] && latestPriceData[base][target]) {
              pairData.basePrice = latestPriceData[base][target].basePrice;
              pairData.targetPrice = latestPriceData[base][target].targetPrice;
            }
            
            pairs.push(pairData);
          }
        });
      });
    }
    
    // Sort pairs by absolute deviation (highest first)
    const sortedPairs = pairs.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
    
    // Only show top 20 pairs to avoid overwhelming the table
    const topPairs = sortedPairs.slice(0, 20);
    
    // Format the datetime
    const formatDateTime = (timestamp) => {
      if (!timestamp) return 'N/A';
      
      const date = new Date(timestamp);
      return date.toLocaleString(undefined, { 
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };
    
    // Format price for display
    const formatPrice = (price) => {
      if (price === undefined || price === null) return 'N/A';
      
      // Format based on magnitude
      if (price < 0.01) return price.toFixed(6);
      if (price < 1) return price.toFixed(4);
      if (price < 1000) return price.toFixed(2);
      return price.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
    
    return (
      <div className="table-responsive">
        <Table hover size="sm" className="deviation-table">
          <thead>
            <tr>
              <th>Pair</th>
              <th>Direction</th>
              <th>Deviation</th>
              <th>Base Price</th>
              <th>Target Price</th>
              <th>Date/Time</th>
            </tr>
          </thead>
          <tbody>
            {topPairs.map((pair, index) => {
              const isPositive = pair.deviation > 0;
              
              return (
                <tr key={index}>
                  <td>
                    <strong>{pair.baseCoin}</strong> / {pair.targetCoin}
                  </td>
                  <td>
                    {isPositive ? (
                      <span className="text-success">↗ Outperforming</span>
                    ) : (
                      <span className="text-danger">↘ Underperforming</span>
                    )}
                  </td>
                  <td className={isPositive ? "text-success" : "text-danger"}>
                    {isPositive ? "+" : ""}{pair.deviation.toFixed(2)}%
                  </td>
                  <td className="text-monospace small">
                    {formatPrice(pair.basePrice)}
                  </td>
                  <td className="text-monospace small">
                    {formatPrice(pair.targetPrice)}
                  </td>
                  <td className="text-muted small">
                    {formatDateTime(pair.timestamp)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <h5 className="mb-3">Relative Deviation Chart</h5>
        
        <div className="d-flex flex-wrap justify-content-between mb-3">
          <div>
            <Tabs
              activeKey={tabDisplayType}
              onSelect={(key) => setTabDisplayType(key)}
              className="mb-3"
            >
              <Tab eventKey={0} title="Time Series">
                {/* No additional content needed here, we'll render the chart based on the selected tab */}
              </Tab>
              <Tab eventKey={1} title="Heatmap">
                {/* No additional content needed here, we'll render the chart based on the selected tab */}
              </Tab>
            </Tabs>
          </div>
          
          <div className="d-flex flex-wrap">
            <Form.Group className="me-2 mb-2" controlId="timeRange">
              <Form.Select 
                value={timeRange} 
                onChange={handleTimeRangeChange}
                className="form-select-sm"
              >
                <option value="1h">Last hour</option>
                <option value="6h">Last 6 hours</option>
                <option value="12h">Last 12 hours</option>
                <option value="24h">Last 24 hours</option>
                <option value="3d">Last 3 days</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-2" controlId="baseCoin">
              <Form.Select 
                value={baseCoin} 
                onChange={handleBaseCoinChange}
                className="form-select-sm"
              >
                <option value="">All coins</option>
                {deviationData.coins.map(coin => (
                  <option key={coin} value={coin}>{coin}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>
        </div>
        
        <div style={{ height: '400px', width: '100%' }}>
          {tabDisplayType == 0 ? renderLineChart() : renderHeatmap()}
        </div>
        
        <Card.Text className="text-muted mt-3 small">
          <i className="bi bi-info-circle me-1"></i>
          The chart shows relative deviations between coin pairs, helping identify potential trade opportunities.
          Positive values indicate the target coin is performing better than the base coin.
        </Card.Text>
        
        {/* Deviation Data Table */}
        <h5 className="mt-4 mb-3">Deviation Data Table</h5>
        {renderDeviationTable()}
        <Card.Text className="text-muted mt-2 small">
          <i className="bi bi-info-circle me-1"></i>
          This table shows the current relative deviations between coin pairs. A positive deviation means the target coin 
          is outperforming the base coin, suggesting a potential opportunity to switch.
        </Card.Text>
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
