MSMEComponentFactories.standard({ id:'overview', view:'dashboard', label:'Overview', heading:'ADMIN CONTROL CENTRE', required:[
  {name:'Attendance and deadline overview',selector:'#operations-overview'},
  {name:'Role attendance cards',selector:'.attendance-overview-card',minimum:4},
  {name:'Next-week absence estimate',selector:'.absence-estimate-panel'},
  {name:'Habitual leave records',selector:'.overview-habitual-leave'}
]});
