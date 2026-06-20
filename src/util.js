Number.prototype.formatIsk = function( decPlaces, thouSeparator, decSeparator ) {
  const n = this;
  const dp = isNaN( decPlaces = Math.abs( decPlaces )) ? 2 : decPlaces;
  const ds = decSeparator  === undefined ? '.' : decSeparator;
  const ts = thouSeparator === undefined ? ',' : thouSeparator;
  const sign = n < 0 ? '-' : '';
  const abs  = Math.abs( +n || 0 ).toFixed( dp );
  const i    = parseInt( abs ) + '';
  const j    = i.length > 3 ? i.length % 3 : 0;
  return sign +
    ( j ? i.substr( 0, j ) + ts : '' ) +
    i.substr( j ).replace( /(\d{3})(?=\d)/g, '$1' + ts ) +
    ( dp ? ds + Math.abs( abs - i ).toFixed( dp ).slice( 2 ) : '' );
};

function getTeam( groupID ) {
  let foundIndex = -1;
  gTeams.forEach(( team, teamIdx ) => {
    team.forEach( teamMember => {
      if ( groupID == gGroups[ teamMember ].ID ) {
        foundIndex = teamIdx;
      }
    });
  });
  return foundIndex;
}

function convertChartDataToPercent( chartData ) {
  let total = 0;
  chartData.forEach( data => { total += data[ 1 ]; });
  if ( total === 0 ) return false;
  chartData.forEach( data => { data[ 1 ] = Number( ( data[ 1 ] / total * 100 ).toFixed( 1 )); });
  return chartData;
}

function uiSetDateTime( ms, base, index ) {
  const data = new Date( ms );
  const date = `${pad( data.getUTCMonth() + 1 )}/${pad( data.getUTCDate() )}/${data.getUTCFullYear()}`;
  $( base + 'date'  + index ).val( date );
  $( base + 'timeH' + index ).val( pad( data.getUTCHours() ));
  $( base + 'timeM' + index ).val( pad( data.getUTCMinutes() ));
}

function uiGetDateTime( base, index ) {
  const baseDate = new Date( Date.parse( $( base + 'date' + index ).val() ));
  return Date.UTC(
    baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(),
    $( base + 'timeH' + index ).val(),
    $( base + 'timeM' + index ).val()
  );
}

function createZkbDate( ms ) {
  const date = new Date( ms );
  return `${date.getUTCFullYear()}${pad( date.getUTCMonth() + 1 )}${pad( date.getUTCDate() )}${pad( date.getUTCHours() )}${pad( date.getUTCMinutes() )}`;
}

function createZkbDateStart( ms ) {
  const date = new Date( ms );
  return `${date.getUTCFullYear()}${pad( date.getUTCMonth() + 1 )}${pad( date.getUTCDate() )}${pad( date.getUTCHours() )}${pad( 0 )}`;
}

function createZkbDateEnd( ms ) {
  const date        = new Date( ms );
  const roundDown   = new Date( Date.UTC( date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours() ));
  const roundUp     = new Date( roundDown.valueOf() + 3600000 );
  const target      = date.getUTCMinutes() === 0 ? roundDown : roundUp;
  return `${target.getUTCFullYear()}${pad( target.getUTCMonth() + 1 )}${pad( target.getUTCDate() )}${pad( target.getUTCHours() )}${pad( target.getUTCMinutes() )}`;
}

function parseZkbDate( zkbDate ) {
  const date = new Date();
  date.setUTCFullYear( zkbDate.substring( 0, 4 ));
  date.setUTCMonth(    parseInt( zkbDate.substring( 4,  6 )) - 1 );
  date.setUTCDate(     zkbDate.substring( 6,  8 ));
  date.setUTCHours(    zkbDate.substring( 8,  10 ));
  date.setUTCMinutes(  zkbDate.substring( 10, 12 ));
  return date;
}

function parse_url_params( url ) {
  const hashes = url.slice( url.indexOf( '?' ) + 1 ).split( '&' );
  const vars   = [];
  hashes.forEach( hash => {
    const parts = hash.split( '=' );
    vars.push( parts[ 0 ] );
    vars[ parts[ 0 ] ] = parts[ 1 ];
  });
  return vars;
}

function ship_type_idtoName( ship_type_id ) {
  const found = gShipTypes.find( s => s.I == ship_type_id );
  return found === undefined ? 'unknown' : found.N;
}

function getShipClass( shipID ) {
  const found = gShipTypes.find( s => s.I == shipID );
  return found === undefined ? 'unknown' : found.G;
}

function getShipClassOrder( shipID ) {
  const found = gShipTypes.find( s => s.I == shipID );
  return found === undefined ? 999999 : found.O;
}

function ship_type_idtoType( ship_type_id ) {
  const found = gShipTypes.find( s => s.I == ship_type_id );
  if ( found === undefined ) return 'unknown';
  return typeof found.G !== 'undefined' ? found.G : 'unknown';
}

function solarSystemIDtoName( solarSystemID ) {
  return gSolarSystems.find( s => s.I == solarSystemID ).N;
}

// ---------------------------------------------------------------------------------------------------------------------
// utility methods
// ---------------------------------------------------------------------------------------------------------------------
function pad( num ) {
  return num < 10 ? '0' + num : String( num );
}

function pad_field( field, count, padding ) {
  let value = $( field ).val();
  while ( value.length < count ) { value = '0' + value; }
  $( field ).val( value );
}

function format_time_for_chart_label( time ) {
  if ( time === undefined ) return '';
  return `${pad( time.getHours() )}:${pad( time.getMinutes() )}`;
}

function logTimer( msgText, startTime ) {
  const now = new Date();
  if ( startTime !== undefined ) {
    console.log( `${msgText}: ${now.getTime() - startTime.getTime()}ms` );
  }
  return now;
}

function profile( text, func ) {
  const timer = new Date();
  func();
  logTimer( text, timer );
}

function Bold( content )    { return `<b>${content}</b>`; }
function Italics( content ) { return `<i>${content}</i>`; }

function zKillLink( service, value, text ) {
  return service && value && text
    ? `<a href="https://zkillboard.com/${service}/${value}/">${text}</a>`
    : '';
}

function eveImageLink( service, id ) {
  const suffix = service === 'Character' ? '_32.jpg' : '_32.png';
  return `<img src="https://image.eveonline.com/${service}/${id}${suffix}">`;
}

function MakeHtml( keyword, cls, content ) {
  return `<${keyword} class="${cls}">${content}</${keyword}>`;
}

function TableData( cls, content ) { return MakeHtml( 'td', cls, content ); }
function TableRow( cls, content )  { return MakeHtml( 'tr', cls, content ); }

function createEmptyArray( count ) {
  return Array.from( { length: count }, () => 0 );
}

function roundIsk( isk ) {
  if ( isk > ONE_BILLION ) return `${Math.round( isk * 100 / ONE_BILLION ) / 100}b`;
  if ( isk < ONE_MILLION ) return `${Math.round( isk * 100 / 1000       ) / 100}k`;
  return `${Math.round( isk * 100 / ONE_MILLION ) / 100}m`;
}

function assert( condition ) {
  if ( !condition ) {
    console.log( 'assertion failed, set breakpoint in util.js to debug assertion' );
  }
}

function isCapsule( ship_type_id ) {
  return ship_type_id == 670 || ship_type_id == 33328;
}

function waitCursor( onOff ) {
  if ( onOff ) {
    if ( gWaitCursor++ === 0 ) $( 'html' ).addClass( 'waiting' );
  } else {
    if ( --gWaitCursor === 0 ) $( 'html' ).removeClass( 'waiting' );
  }
}

// Decimal adjustment polyfill
(function() {
  function decimalAdjust( type, value, exp ) {
    if ( typeof exp === 'undefined' || +exp === 0 ) return Math[ type ]( value );
    value = +value;
    exp   = +exp;
    if ( isNaN( value ) || !( typeof exp === 'number' && exp % 1 === 0 )) return NaN;
    value = value.toString().split( 'e' );
    value = Math[ type ]( +( value[ 0 ] + 'e' + ( value[ 1 ] ? ( +value[ 1 ] - exp ) : -exp )));
    value = value.toString().split( 'e' );
    return +( value[ 0 ] + 'e' + ( value[ 1 ] ? ( +value[ 1 ] + exp ) : exp ));
  }

  if ( !Math.round10 ) Math.round10 = ( value, exp ) => decimalAdjust( 'round', value, exp );
  if ( !Math.floor10 ) Math.floor10 = ( value, exp ) => decimalAdjust( 'floor', value, exp );
  if ( !Math.ceil10  ) Math.ceil10  = ( value, exp ) => decimalAdjust( 'ceil',  value, exp );
})();
