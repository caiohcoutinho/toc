Vue.filter('toCurrency', function (value) {
    if (typeof value !== "number") {
        return value;
    }
    var formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    });
    return formatter.format(value);
});

const Scenario = function(name, processes){
	this.name = name;
	this.processes = processes;
}

const Log = function(message){
	this.timestamp = new Date();
	this.message = message;
}

const Process = function(capacity, variance){
	this.capacity = capacity;
	this.variance = variance;
	this.production = 0;
	this.averageInventory = 0;
	this.inventory = 0;
	this.totalInventory = 0;
}

var app = new Vue({
  el: '#app',
  data: {
    timeoutId: undefined,
    message: "idle",
    lastRefreshed: undefined,
    interval: 0,
    currentTick: 0,
    logs: [],
    hideOptions: true,
    hideScenarios: false,
    maxTicks: 1010,
    providerMaterialPrice: 0.1,
    operationalCosts: 1,
    inventoryStorageCosts: 0.05,
    endProductPrice: 3,
    finances: {
		providerCosts: 0,
		inventoryStorageCosts: 0,
		operationalCosts: 0,
		sells: 0,
	},
    processes: [
    	new Process(10, 4),
    	new Process(10, 4),
    	new Process(10, 4),
    	new Process(10, 4),
    	new Process(10, 4),
    	new Process(10, 4),
    	new Process(10, 4),
    	new Process(10, 4),
	],
	scenarios: [
		new Scenario("Herbie at the end", [
	    	new Process(10, 1),
	    	new Process(9, 1),
	    	new Process(9, 1),
	    	new Process(8, 1),
	    	new Process(8, 1),
	    	new Process(7, 1),
	    	new Process(7, 1),
	    	new Process(6, 1),
	    	new Process(6, 1),
	    	new Process(5, 1),
		]),
		new Scenario("Herbie at the start", [
	    	new Process(5, 1),
	    	new Process(6, 1),
	    	new Process(6, 1),
	    	new Process(7, 1),
	    	new Process(7, 1),
	    	new Process(8, 1),
	    	new Process(8, 1),
	    	new Process(9, 1),
	    	new Process(9, 1),
	    	new Process(10, 1),
		]),
	],
    production: 0,
    inventory: 0,
  },
  computed: {
  	sortedLogs: function(){
  		return _.sortBy(this.logs, "timestamp");
  	},
  	profit: function(){
  		return - this.finances.providerCosts
  			- this.finances.inventoryStorageCosts - this.finances.operationalCosts
  			+ this.finances.sells;
  	}
  },
  methods: {
  	profitStyle: function(){
  		if(this.profit > 0){
  			return {"green": true};
  		}
  		return {"red": true};
  	},
  	chooseScenario: function(scenario){
  		this.processes = scenario.processes;
  	},
  	clearLogs: function(){
  		this.logs = [];
  	},
  	log: function(message){
  		this.logs.push(new Log(message));
  	},
  	test: function(effectiveness){
  		return Math.random()*100 <= effectiveness;
  	},
	gaussianRandom: function(mean=0, stdev=1) {
    	// Standard Normal variate using Box-Muller transform.
	    let u = 1 - Math.random(); //Converting [0,1) to (0,1)
	    let v = Math.random();
	    let z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
	    // Transform to the desired mean and standard deviation:
	    return Math.floor(z * stdev + mean);
	},
  	start: function(){
		if (this.timeoutId){
			alert("Not starting. timeoutId exists");
			return;
		} 
		this.currentTick = 0;

		_.each(this.processes, (p) => {
			p.inventory = 0;
			p.production = 0;
			p.averageInventory = 0;
			p.totalInventory = 0;
		})
		this.production = 0;
		this.finances = {
			providerCosts: 0,
			inventoryStorageCosts: 0,
			operationalCosts: 0,
			sells: 0,
		};

	    this.run();
  	},
  	run: function(){
  		this.currentTick++;
  		if(this.currentTick > this.maxTicks){
  			this.stop();
  			return;
  		}
  		const vm = this;
  		this.timeoutId = setTimeout(function(){
  			try {
  				vm.tick();
  			} catch (e){
  				this.message = e;
  			} finally {
  				vm.run();
  			}
  		}, this.interval)
  	},
  	stop: function(){
  		clearTimeout(this.timeoutId);
  		this.timeoutId = undefined;
  		this.currentTick = 0;
  	},
	tick: function(){
	    this.lastRefreshed = new Date();

	    let providerBatch = 5;
	    if(this.processes[0].inventory <= providerBatch){
	    	// purchase more material from the provider
	    	this.processes[0].inventory += providerBatch;
	    	this.finances.providerCosts += providerBatch * this.providerMaterialPrice; 
	    }

	    _.each(this.processes, (p) => {
	    	p.totalInventory += p.inventory;
	    	p.averageInventory = p.totalInventory / this.currentTick;

	    	let productivity = this.gaussianRandom(p.capacity, p.variance);
	    	let result = Math.min(p.inventory, productivity);
	    	p.inventory -= result;
	    	p.production += result;

	    	this.finances.operationalCosts += this.operationalCosts;
	    });

	    for(let i = 0; i < _.size(this.processes)-1; i++){
	    	let movement = this.processes[i].production;
	    	this.processes[i+1].inventory += movement;
	    	this.processes[i].production = 0;

	    	this.finances.inventoryStorageCosts += movement * this.inventoryStorageCosts;
	    }

	    let lastProcess = this.processes[_.size(this.processes)-1];
	    let movement = lastProcess.production
	    this.production += movement;
	    this.finances.sells += movement * this.endProductPrice;

	    lastProcess.production = 0;
  	},
  }
})