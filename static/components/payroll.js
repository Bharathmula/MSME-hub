MSMEComponentFactories.standard({ id:'payroll', view:'payroll', label:'Payroll', heading:'PAYROLL', required:[
  {name:'Payroll table',selector:'.payroll-panel table'},
  {name:'Payroll CSV control',selector:'#download-payroll'}
]});
