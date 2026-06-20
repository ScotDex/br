let gOptIgnoreInsig         = true;
let gOptIgnorePods          = false;
let gOptIgnoreRookieShips   = false;
let gOptIgnoreAllNonShips   = false;
let gOptIgnorePosMods       = false;
let gOptIgnoreDeployables   = false;
let gOptIgnoreUnknowns      = false;
let gOptIgnoreNPCs          = false;

let gOptHideAvatars         = false;
let gOptHideLogos           = false;

let gOptEstimateFighterValues = true;

function createCheckboxCell( name, text, checked ) {
  return TableData( '', `<input type="checkbox" name="${name}" onchange="updateOptions('${name}')"${checked ? ' checked' : ''}>${text}</input>` );
}

function generateOptionsTab( target ) {
  const html = [
    '<b><i>Under development</i></b><br><form><table><tr>',
    '</tr><tr>',
    createCheckboxCell( 'optInsig',        'Ignore insignificant corps/alliances', gOptIgnoreInsig ),
    '</tr><tr>',
    createCheckboxCell( 'optFighterValues','Disable fighter value estimation',     gOptEstimateFighterValues ),
    '</tr></table></form>'
  ];
  $( target ).empty().append( html.join( '' ));
}

function updateOptions( option ) {
  if ( option === 'optInsig' ) {
    gOptIgnoreInsig = !gOptIgnoreInsig;
    updateShareLink();
    console.log( `gOptIgnoreInsig:${gOptIgnoreInsig}` );
  }
  if ( option === 'optFighterValues' ) {
    gOptEstimateFighterValues = !gOptEstimateFighterValues;
    updateShareLink();
    console.log( `gOptEstimateFighterValues:${gOptEstimateFighterValues}` );
    startParsing();
  }
}
