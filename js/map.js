$(document).ready(function(){

// initiate variables
var xcel = null;
var loading_animation = "<div class=\"lds-spinner\"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>"
var points_eligible

// ajax callbacks to load data
function ajaxCallBackXcel(retString){
	xcel = retString; // xcel service territory json
}

function ajaxCallBackCo(retString){
	mn_counties = retString; //mn counties json
}

// load geojson layers
$.ajax({
dataType: "json",
url: "js/xcel.json",
success: function(data) {
		ajaxCallBackXcel(data);
}
}).error(function() { console.log('error')});

$.ajax({
dataType: "json",
url: "js/mn_counties.json",
success: function(data) {
		ajaxCallBackCo(data);
}
}).error(function() { console.log('error')});



var map = L.map('map', {zoomControl: false}).setView([45.0, -93.3], 8),
	layer = L.esri.basemapLayer("Gray").addTo(map);
	//layerLabels = L.esri.basemapLayer('GrayLabels').addTo(map);
	layerLabels = null;

function setBasemap(basemap) {
	if (layer) {
		map.removeLayer(layer);
	}
	if (basemap === 'WHS') {
		L.esri.basemapLayer("Gray").addTo(map);
	}
	else {
		layer = L.esri.basemapLayer(basemap);
	}
	map.addLayer(layer);
	if (layerLabels) {
		map.removeLayer(layerLabels);
	}
	if (basemap === 'ShadedRelief' || basemap === 'Oceans' || basemap === 'DarkGray' || basemap === 'Imagery' || basemap === 'Terrain') {
		layerLabels = L.esri.basemapLayer(basemap + 'Labels');
		map.addLayer(layerLabels);
	}
}

L.control.zoom({
	position:'topright'
}).addTo(map);


//
// style functions
//



//
// feature layers
//

var point_icon = L.icon({
	iconUrl: 'img/icon1.svg',
	iconSize: [30,30]
})

var points = L.esri.featureLayer({
		url: 'https://services9.arcgis.com/YEQ7YfprtcM3j3JL/arcgis/rest/services/solar_projects_view/FeatureServer/0',
		pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
				icon: point_icon
			});
		},
				onEachFeature: function(feature, layer) {
						layer.bindPopup(feature.properties.name);
				}
	});


var premises = L.esri.featureLayer({
		url: 'https://services9.arcgis.com/YEQ7YfprtcM3j3JL/arcgis/rest/services/solar_projects_view/FeatureServer/1',
		style: {
			weight: 1,
			color: 'orange'
		},
				onEachFeature: function(feature, layer) {
						layer.bindPopup(feature.properties.name);
				}
	});



//
// initiate layers
//

points.addTo(map);




/*
map.on('zoomend', function() {
		if (map.getZoom() <15){
		points.addTo(map);
	} else {
		map.removeLayer(points);
	}
});

map.on('zoomend', function() {
	if (map.getZoom() <15){
		map.removeLayer(premises);
	} else {
		premises.addTo(map);
	}
});
*/	

map.on('mousedown', function(e) {
	if ( $('#collapseBasemaps').hasClass("in")) {
		$('#collapseBasemaps').removeClass('in');
	}
});



//var searchControl = L.esri.Geocoding.Controls.geosearch({expanded: true, collapseAfterResult: false, zoomToResult: false}).addTo(map);
var searchControl = L.esri.Geocoding.geosearch({expanded: true, collapseAfterResult: true, zoomToResult: true, useMapBounds:false, placeholder:'Enter your address here...' }).addTo(map);

searchControl.on('results', function(data){
	$("#loading").removeClass('loadingHidden'); //set up loading animation
	$("#loading").append(loading_animation);
	$("#loading").addClass('loadingOn');

	map.eachLayer(function (layer) {  //remove all layers and add basemap back.  This isn't ideal but map.hasLayer is behaving unexpectedly here.
  	map.removeLayer(layer);
	});
	L.esri.basemapLayer("Gray").addTo(map);
	
	
	setTimeout(function() { //run in timeout function to allow loading screen
		if (data.results.length > 0) {
		var point = turf.point([data.results[0].latlng.lng, data.results[0].latlng.lat]);
		var isEligible = false;
		var result = 'Not Eligible';
		for (let idx in xcel.features) {
			if (turf.booleanPointInPolygon(point, xcel.features[idx]) === true) {
				var isEligible = true;
			}
		}
		if (isEligible === true) {
			var result = 'Eligible';
			var selected_points_locations = [];
			var name_SQL = "(";
			for (let idx in mn_counties.features) {
				if (turf.booleanPointInPolygon(point, mn_counties.features[idx]) === true) {
					var buffered = turf.buffer(mn_counties.features[idx], 500, {units: 'feet'});
					for (let idx in mn_counties.features) {
						if (turf.booleanDisjoint(buffered, mn_counties.features[idx]) === false) {
							for (let item in points._layers) {
								point = turf.point(points._layers[item].feature.geometry.coordinates);
								if (turf.booleanPointInPolygon(point, mn_counties.features[idx]) === true) {
									console.log(points._layers[item].feature.properties.name)
									selected_points_locations.push(points._layers[item].feature.properties.name)
									add_name = "'" + points._layers[item].feature.properties.name + "',";
									name_SQL += add_name;
								}
							}
						}
					}
				}
			}

			name_SQL = name_SQL.slice(0,-1);
			name_SQL = name_SQL + ")";
		
			var points_eligible = L.esri.featureLayer({
				where: "name IN " + name_SQL,
				url: 'https://services9.arcgis.com/YEQ7YfprtcM3j3JL/arcgis/rest/services/solar_projects_view/FeatureServer/0',
				pointToLayer: function (geojson, latlng) {
					return L.marker(latlng, {
						icon: point_icon
					});
				},
				onEachFeature: function(feature, layer) {
					layer.bindPopup(feature.properties.name);
				}
			});
		
			points_eligible.addTo(map);
		}			
		
		var popup = L.popup()
			.setLatLng(data.results[0].latlng)
			.setContent("<div class=\"symbPop\">" + data.results[0].text + '<BR><BR><BR>' + result + "</div>")
			.openOn(map);
		map.setView(data.results[0].latlng)
		}
		$("#loading").removeClass('loadingOn');
		$("#loading").addClass('loadingHidden');
		$("#loading").removeClass('loadingOn');
		$("#loading").empty();
	}, 900);
});



	//
	// jQuery listeners
	//


		$("#selectStandardBasemap").on("change", function(e) {
				setBasemap($(this).val());
			});


		$('#operating-btn').click(function () {
				$('#operating-btn').toggleClass('btn-info');
				$('#operating-btn').toggleClass('btn-secondary');
			});

		$('#future-btn').click(function () {
				$('#future-btn').toggleClass('btn-info');
				$('#future-btn').toggleClass('btn-secondary');
			});




		// Search
				var input = $(".geocoder-control-input");
				input.focus(function(){
					$("#panelSearch .panel-body").css("height", "auto");
				});
				input.blur(function(){
					 $("#panelSearch .panel-body").css("height", "auto");
				});
				// Attach search control for desktop or mobile
				function attachSearch() {
					var parentName = $(".geocoder-control").parent().attr("id"),
						geocoder = $(".geocoder-control"),
						width = $(window).width();
						$("#geocode").append(geocoder);
				}
				attachSearch();


});

