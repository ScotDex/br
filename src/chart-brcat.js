function convertToTime( timeText ) {
  const time = new Date();
  time.setUTCFullYear( timeText.substring( 0, 4 ), Number( timeText.substring( 5, 7 )) - 1, timeText.substring( 8, 10 ));
  time.setUTCHours( timeText.substring( 11, 13 ), timeText.substring( 14, 16 ), 0 );
  return time;
}

function draw_pie_charts_summary() {
  const chartData    = generate_pie_chart();
  const chartDataDmgRcv = chartData.pop();
  const chartDataDmg    = chartData.pop();
  const chartDataIsk    = chartData.pop();
  draw_pie_chart( chartDataIsk,    'Isk Lost',         'IskChart',    'Isk' );
  draw_pie_chart( chartDataDmg,    'Damage Dealt',     'DmgChart',    'HP' );
  draw_pie_chart( chartDataDmgRcv, 'Damage Received',  'DmgRcvChart', 'HP' );
}

function createChartRadio( id, name, chart ) {
  const inp   = `<input type="radio" id="radio${id}" name="radio" ${gActiveChart === name ? 'checked="checked"' : ''} class="ui-helper-hidden-accessible">`;
  const span  = MakeHtml( 'span', 'ui-button-text no_padding', chart );
  const label = `<label onclick="setActiveChart('${name}');" for="radio${id}" class="ui-button ui-widget ui-state-default ui-button-text-only" role="button">${span}</label>`;
  return inp + label;
}

function createChartTypeRadio( id, name, chart ) {
  const inp   = `<input type="radio" id="radioType${id}" name="radioType" ${gActiveChartType === name ? 'checked="checked"' : ''} class="ui-helper-hidden-accessible">`;
  const span  = MakeHtml( 'span', 'ui-button-text no_padding', chart );
  const label = `<label onclick="setActiveChartType('${name}');" for="radioType${id}" class="ui-button ui-widget ui-state-default ui-button-text-only" role="button">${span}</label>`;
  return inp + label;
}

function draw_charts() {
  Highcharts.setOptions( Highcharts.theme );
  $( '#chartTab' ).empty();

  const spacerHtml = '<div id="spacer" style="width:50%;height:20px;margin-left:auto; margin-right:auto;">';

  const chartItemHtml = [
    '<div id="radioset1" class="ui-buttonset" style="margin-left:auto; margin-right:auto; text-align:center;">',
    createChartRadio( '1', 'kill',      'Kills' ),
    createChartRadio( '2', 'killTotal', 'Total Kills' ),
    createChartRadio( '3', 'isk',       'Isk Lost' ),
    createChartRadio( '4', 'iskTotal',  'Total Isk Lost' ),
    createChartRadio( '5', 'dps',       'DPS rcvd' ),
    createChartRadio( '6', 'dpsDone',   'DPS done' ),
    createChartRadio( '7', 'involved',  'Involved' ),
    '</div>'
  ].join( '' );

  const chartTypeHtml = [
    '<div id="radioset2" class="ui-buttonset" style="margin-left:auto; margin-right:auto; text-align:center;">',
    createChartTypeRadio( '1', 'column', 'Column Chart' ),
    createChartTypeRadio( '2', 'line',   'Line Chart' ),
    '</div>'
  ].join( '' );

  $( '#chartTab' ).append( spacerHtml );
  $( '#chartTab' ).append( chartItemHtml );
  $( '#radioset1' ).buttonset();

  $( '#chartTab' ).append( spacerHtml );
  $( '#chartTab' ).append( '<div id="mainChart" style="width:90%; height:400px; margin-left:auto; margin-right:auto;"></div>' );

  drawMainChart();

  $( '#chartTab' ).append( chartTypeHtml );
  $( '#radioset2' ).buttonset();
  $( '#chartTab' ).append( spacerHtml );

  profile( 'draw_pie_charts_summary', () => draw_pie_charts_summary() );
}

function drawMainChart() {
  profile( 'draw_kill_chart', () => {
    switch ( gActiveChart ) {
      case 'kill':      draw_kill_chart( 'kill',      'Kill Graph',                   'Kills per ',              'mainChart', 'kills' ); break;
      case 'killTotal': draw_kill_chart( 'killTotal', 'Total Kills Graph',            'Total kills per ',        'mainChart', 'kills' ); break;
      case 'isk':       draw_kill_chart( 'isk',       'Isk Graph',                   'Isk lost per ',           'mainChart', 'isk'   ); break;
      case 'iskTotal':  draw_kill_chart( 'iskTotal',  'Total Isk Graph',             'Total Isk lost per ',     'mainChart', 'isk'   ); break;
      case 'dps':       draw_kill_chart( 'dps',       'Damage Per Second Graph',     'Damage Per Second ',      'mainChart', 'HP/s'  ); break;
      case 'dpsDone':   draw_kill_chart( 'dpsDone',   'Damage Done Per Second Graph','Damage Done Per Second ', 'mainChart', 'HP/s'  ); break;
      case 'involved':  draw_kill_chart( 'involved',  'Involved Graph',              'Involved in battle over time ', 'mainChart', 'players' ); break;
    }
  });
}

function setActiveChart( activeChart ) {
  gActiveChart = activeChart;
  drawMainChart();
}

function setActiveChartType( activeChartType ) {
  gActiveChartType = activeChartType;
  drawMainChart();
}

function draw_pie_chart( chartData, title, target, units ) {
  $( '#chartTab' ).append( `<div id="${target}" style="width:50%; height:200px; margin-left:auto; margin-right:auto;"></div>` );
  $( `#${target}` ).highcharts({
    colors: [ '#333399','#993333','#339933','#993399','#999933','#339999','#aaaaaa' ],
    chart: { plotBackgroundColor: null, plotBorderWidth: null, plotShadow: false },
    title: { text: title },
    tooltip: { pointFormat: `{series.name}: <b>{point.percentage:.1f}%</b><br>{point.y} ${units}` },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: false,
          color: '#000000',
          connectorColor: '#000000',
          format: '<b>{point.name}</b>: {point.percentage:.1f} %'
        },
        showInLegend: true
      }
    },
    series: [{ type: 'pie', name: title, data: chartData }]
  });
  $( '#chartTab' ).append( '<div id="spacer" style="width:50%;height:35px;margin-left:auto; margin-right:auto;">' );
}

function draw_kill_chart( chartDataName, title, yAxisLabelText, target, unit ) {
  const chartData   = generateKillChartData( chartDataName );
  const interval    = chartData.pop();
  const seriesData  = chartData.slice( 1 ).map(( data, i ) => ({ name: `Team ${i + 1}`, data }));
  const xAxisStep   = Math.round( seriesData[ 0 ].data.length / 10 );

  $( `#${target}` ).highcharts({
    colors: [ '#333399','#993333','#339933','#993399','#999933','#339999','#aaaaaa' ],
    chart: { type: gActiveChartType, zoomType: 'x' },
    title: { text: title },
    xAxis: { categories: chartData[ 0 ], labels: { enabled: true, step: xAxisStep, maxStaggerLines: 1 }},
    yAxis: {
      min: 0,
      title: { text: `${yAxisLabelText}${interval} min` },
      stackLabels: { enabled: false, style: { fontWeight: 'bold', color: ( Highcharts.theme && Highcharts.theme.textColor ) || 'gray' }}
    },
    tooltip: {
      formatter() {
        let s = `<b>${this.x}</b><br/>${this.series.name}: ${( unit === 'isk' || unit === 'HP/s' ) ? Number( this.y ).formatIsk() : this.y} ${unit}`;
        if ( gActiveChartType === 'column' ) {
          s += `<br/>Total: ${( unit === 'isk' || unit === 'HP/s' ) ? Number( this.point.stackTotal ).formatIsk() : this.point.stackTotal} ${unit}`;
        }
        return s;
      }
    },
    plotOptions: {
      series: { marker: { enabled: false, states: { hover: { enabled: true }}}},
      column: { stacking: 'normal', dataLabels: { enabled: false, color: ( Highcharts.theme && Highcharts.theme.dataLabelsColor ) || 'white' }}
    },
    series: seriesData
  });
}

function generateKillChartData( typeOfChart ) {
  if ( !gData || gData.length <= 0 ) return [];

  const lastKill    = convertToTime( gData[ gData.length - 1 ].killmail_time );
  const firstKill   = convertToTime( gData[ 0 ].killmail_time );
  const killTimespan = Math.round(( lastKill.getTime() - firstKill.getTime() ) / MS_PER_MINUTE ) + 1;

  let interval = 1;
  if ( killTimespan > 180  ) interval = 5;
  if ( killTimespan > 600  ) interval = 10;
  if ( killTimespan > 1440 ) interval = 60;

  const xAxis     = [];
  const teamArrays = Array.from({ length: 7 }, () => []);

  for ( let i = 0; i < killTimespan; i += interval ) {
    xAxis.push( format_time_for_chart_label( new Date( firstKill.getTime() + i * MS_PER_MINUTE )));
    teamArrays.forEach( arr => arr.push( 0 ));
  }

  const chartData = [ xAxis ];
  teamArrays.slice( 0, gTeams.length ).forEach( arr => chartData.push( arr ));

  if ( typeOfChart === 'involved' ) {
    gPlayers.forEach( player => {
      let firstTimeIndex = -1;
      player.ships.forEach( ship => {
        const kill      = ship.kills[ ship.kills.length - 1 ];
        const fullKill  = gData.find( km => km.killmail_id === kill.killmail_id );
        const killTime  = convertToTime( fullKill.killmail_time );
        const timeIndex = Math.floor(( killTime.getTime() - firstKill.getTime() ) / MS_PER_MINUTE / interval );
        if ( firstTimeIndex === -1 || timeIndex < firstTimeIndex ) firstTimeIndex = timeIndex;
      });
      const teamIndex = getTeam( player.alliance_id ? player.alliance_id : player.corporation_id );
      if ( teamIndex > -1 ) chartData[ teamIndex + 1 ][ firstTimeIndex ]++;
    });
    chartData.slice( 1 ).forEach(( team, idx ) => {
      let prev = 0;
      team.forEach(( val, tdx ) => {
        chartData[ idx + 1 ][ tdx ] += prev;
        prev = chartData[ idx + 1 ][ tdx ];
      });
    });
  } else {
    const kills = gData.reduce(( acc, item ) => {
      ( acc[ item.killmail_time ] ??= [] ).push( item );
      return acc;
    }, {});

    Object.values( kills ).forEach( timeslice => {
      timeslice.forEach( kill => {
        const killTime  = convertToTime( kill.killmail_time );
        const timeIndex = Math.floor(( killTime.getTime() - firstKill.getTime() ) / MS_PER_MINUTE / interval );
        const teamIndex = getTeam( kill.victim.alliance_id ? kill.victim.alliance_id : kill.victim.corporation_id );
        if ( teamIndex > -1 ) {
          if ( typeOfChart === 'kill' || typeOfChart === 'killTotal' ) {
            chartData[ teamIndex + 1 ][ timeIndex ]++;
          } else if ( typeOfChart === 'dps' ) {
            chartData[ teamIndex + 1 ][ timeIndex ] += kill.victim.damage_taken / interval / 60;
          } else if ( typeOfChart === 'isk' || typeOfChart === 'iskTotal' ) {
            if ( kill.zkb !== undefined ) chartData[ teamIndex + 1 ][ timeIndex ] += Number( kill.zkb.totalValue );
          } else if ( typeOfChart === 'dpsDone' ) {
            kill.attackers.forEach( attacker => {
              const atkTeam = getTeam( attacker.alliance_id ? attacker.alliance_id : attacker.corporation_id );
              if ( atkTeam > -1 ) chartData[ atkTeam + 1 ][ timeIndex ] += Number( attacker.damage_done / interval / 60 );
            });
          }
        }
      });
    });

    if ( typeOfChart === 'iskTotal' || typeOfChart === 'killTotal' ) {
      chartData.slice( 1 ).forEach(( team, idx ) => {
        let prev = 0;
        team.forEach(( val, tdx ) => {
          chartData[ idx + 1 ][ tdx ] += prev;
          prev = chartData[ idx + 1 ][ tdx ];
        });
      });
    }
  }

  chartData.push( interval );
  return chartData;
}

function generate_pie_chart() {
  const chartDataIsk    = [];
  const chartDataDmg    = [];
  const chartDataDmgRcv = [];

  gTeams.forEach(( team, teamIdx ) => {
    let dmgDealt = 0, dmgTaken = 0, iskLost = 0;
    team.forEach( member => {
      dmgDealt += gGroups[ member ].damage_dealt;
      dmgTaken += gGroups[ member ].damage_taken;
      iskLost  += gGroups[ member ].iskLost;
    });
    chartDataIsk.push(    [ `Team ${teamIdx + 1}`, iskLost  ]);
    chartDataDmg.push(    [ `Team ${teamIdx + 1}`, dmgDealt ]);
    chartDataDmgRcv.push( [ `Team ${teamIdx + 1}`, dmgTaken ]);
  });

  return [ chartDataIsk, chartDataDmg, chartDataDmgRcv ];
}
