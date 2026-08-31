MSMEComponentFactories.roster({ id:'temporary-workers', view:'temporary', label:'Temporary Workers', heading:'TEMPORARY WORKFORCE',
  records:()=>typeof temporaryWorkers==='undefined'?[]:temporaryWorkers, rowSelector:'[data-temp]', addSelector:'#add-temporary' });
