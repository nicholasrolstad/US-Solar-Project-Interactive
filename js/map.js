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
url: "js/mn_counties_ltd.json",
success: function(data) {
		ajaxCallBackCo(data);
}
}).error(function() { console.log('error')});



var map = L.map('map', {zoomControl: false}).setView([45.03, -93.3], 9),
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
	iconUrl: 'img/icon.svg',
	iconSize: [30,30]
})

var point_icon_grey = L.icon({
	iconUrl: 'img/icon-greyed.svg',
	iconSize: [30,30]
})

var points = L.esri.featureLayer({
		url: 'https://services9.arcgis.com/YEQ7YfprtcM3j3JL/arcgis/rest/services/projects_view/FeatureServer/0',
		pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
				icon: point_icon
			});
		},
	});

var points_operating = L.esri.featureLayer({
		where: "operating_status = 1",
		url: 'https://services9.arcgis.com/YEQ7YfprtcM3j3JL/arcgis/rest/services/projects_view/FeatureServer/0',
		pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
				icon: point_icon
			});
		},
				onEachFeature: function(feature, layer) {
						layer.bindPopup(feature.properties.name);
						if (feature.properties.operating_status == 1) {
							imageLink = "img/" + feature.properties.name.toLowerCase().replace(/ /g, "").replace("solar", "").replace(".", "").replace("uss", "") + ".jpg"
        			layer.bindPopup("<span class=\"popup-title\">" + feature.properties.name + "</span>" + "<br><br><img src=" + imageLink + ">" + "<br><br>" + feature.properties.county + " County  |  In-Operation", {minWidth: 300});
						} else {
							layer.bindPopup(feature.properties.name);
						}
				}
	});
	
var points_future = L.esri.featureLayer({
		where: "operating_status = 0",
		url: 'https://services9.arcgis.com/YEQ7YfprtcM3j3JL/arcgis/rest/services/projects_view/FeatureServer/0',
		pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
				icon: point_icon
			});
		},
				onEachFeature: function(feature, layer) {
						layer.bindPopup(feature.properties.name);
						if (feature.properties.operating_status == 0) {
							imageLink = "img/" + feature.properties.name.toLowerCase().replace(/ /g, "").replace("solar", "").replace(".", "").replace("uss", "") + ".jpg"
        			layer.bindPopup("<span class=\"popup-title\">" + feature.properties.name + "</span>" + "<br><br><img src=" + imageLink + ">" + "<br><br>" + feature.properties.county + " County  |  In-Construction", {minWidth: 300});
						} else {
							layer.bindPopup(feature.properties.name);
						}
				}
	});
	
var points_eligible;
var operating_id = String(points_operating._leaflet_id)
var future_id = String(points_future._leaflet_id)
var results_id;
var ids = [operating_id, future_id]

//
// initiate layers
//

points.addTo(map);
map.removeLayer(points);
points_operating.addTo(map);
points_future.addTo(map);


map.on('mousedown', function(e) {
	if ( $('#collapseBasemaps').hasClass("in")) {
		$('#collapseBasemaps').removeClass('in');
	}
});

map.on('popupopen', function(e) {
	var px = map.project(e.popup._latlng); // find the pixel location on the map where the popup anchor is
	px.y -= e.popup._container.clientHeight/2 // find the height of the popup container, divide by 2, subtract from the Y axis of marker location
	map.panTo(map.unproject(px),{animate: true}); // pan to new center
});


//var searchControl = L.esri.Geocoding.Controls.geosearch({expanded: true, collapseAfterResult: false, zoomToResult: false}).addTo(map);
var searchControl = L.esri.Geocoding.geosearch({expanded: true, collapseAfterResult: true, zoomToResult: true, useMapBounds:false, placeholder:'Enter your address here...' }).addTo(map);

searchControl.on('results', function(data){
	$("#loading").removeClass('loadingHidden'); //set up loading animation
	$("#loading").append(loading_animation);
	$("#loading").addClass('loadingOn');
	$('#operating-btn').removeClass('btn-info');
	$('#operating-btn').addClass('btn-secondary');
	$('#future-btn').removeClass('btn-info');
	$('#future-btn').addClass('btn-secondary');
	$("#panelSearch").removeClass('in');

	map.eachLayer(function (layer) {  //remove all layers and add basemap back.  This isn't ideal but map.hasLayer is behaving unexpectedly here.
  	map.removeLayer(layer);
	});
	L.esri.basemapLayer("Gray").addTo(map);
	
	setTimeout(function() { //run in timeout function to allow loading screen
		if (data.results.length > 0) {
			var point = turf.point([data.results[0].latlng.lng, data.results[0].latlng.lat]);
			var isEligible = false;
			var result = 'Not Eligible';
			var subStatus = false;
			for (let idx in xcel.features) {
				if (turf.booleanPointInPolygon(point, xcel.features[idx]) === true) {
					var isEligible = true;
				}
			}
			
			
			if (isEligible === true) {
				var result = 'Eligible';
				var selected_points_locations = [];
				var selected_points_latlng = [];
				var name_SQL = "(";
				for (let idx in mn_counties.features) {
					if (turf.booleanPointInPolygon(point, mn_counties.features[idx]) === true) {
						var buffered = turf.buffer(mn_counties.features[idx], 500, {units: 'feet'});
						for (let idx in mn_counties.features) {
							if (turf.booleanDisjoint(buffered, mn_counties.features[idx]) === false) {
								for (let item in points._layers) {
									point = turf.point(points._layers[item].feature.geometry.coordinates);
									if (turf.booleanPointInPolygon(point, mn_counties.features[idx]) === true) {
										if (points._layers[item].feature.properties.subscription_status === 1) {
											subStatus = true;
										}
										selected_points_locations.push(points._layers[item].feature.properties.name)
										selected_points_latlng.push(points._layers[item].feature.geometry.coordinates)
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
					url: 'https://services9.arcgis.com/YEQ7YfprtcM3j3JL/arcgis/rest/services/projects_view/FeatureServer/0',
					pointToLayer: function (geojson, latlng) {
						if (geojson.properties.subscription_status == 0) {
							return L.marker(latlng, {
								icon: point_icon_grey
							});
						} else {
							return L.marker(latlng, {
								icon: point_icon
							});
						}
					},
					onEachFeature: function(feature, layer) {
						imageLink = "img/" + feature.properties.name.toLowerCase().replace(/ /g, "").replace("solar", "").replace(".", "").replace("uss", "") + ".jpg"
        		layer.bindPopup("<span class=\"popup-title\">" + feature.properties.name + "</span>" + "<br><br><img src=" + imageLink + ">" + "<BR><BR>" + 
														"<a href=\"https://www.us-solar.com/contact.html\" target=\"_blank\">" + "<span class=\"popup-contact\">Contact US Solar</span>" + "</a>", {minWidth: 300});
					}
				});
				
				points_eligible.addTo(map);
				results_id = String(points_eligible._leaflet_id);
				points.query().bounds(function (error, latlngbounds) {
					map.fitBounds(latlngbounds);
				});
			}
			if (isEligible === true) { // eligible and has projects open to subscription
				if (subStatus === true) {
					var popup = L.popup()
						.setLatLng(data.results[0].latlng)
						.setContent(data.results[0].text + '<BR><BR><BR>' + '<span class=\'address-result\'>' + 'You\'re eligible!' + "</span>" + '<br><br>' + 
												'Check out the map to see which projects are available in your area.' + '<BR><BR>' + '<img src=\'img/icon.svg\' height=\'30\' width=\'30\'>' + '  Projects accepting subscribers'
											 + '<BR>' + '<img src=\'img/icon-greyed.svg\' height=\'30\' width=\'30\'>' + '  Projects already filled' + "<BR><BR>" + 
														"<a href=\"https://www.us-solar.com/mn-signup.html\" target=\"_blank\">" + "<span class=\"popup-contact\">Contact US Solar to subscribe today!</span>" + "</a>")
						.openOn(map);
				} else { // eligible but no projects or no projects open to subscription
					var popup = L.popup()
						.setLatLng(data.results[0].latlng)
						.setContent(data.results[0].text + '<BR><BR><BR>' + 'All projects in your area are currently filled but you may be eligible to subscribe in the future.' + 
												'<BR><BR>' + '<img src=\'img/icon.svg\' height=\'30\' width=\'30\'>' + '  Projects accepting subscribers'
											 + '<BR>' + '<img src=\'img/icon-greyed.svg\' height=\'30\' width=\'30\'>' + '  Projects already filled' + "<BR><BR>" + 
														"<a href=\"https://www.us-solar.com/contact.html\" target=\"_blank\">" + "<span class=\"popup-contact\">Contact US Solar to join our waitlist!</span>" + "</a>")
						.openOn(map);
				}
			} else { // not eligible, not in xcel territory
					var popup = L.popup()
						.setLatLng(data.results[0].latlng)
						.setContent(data.results[0].text + '<BR><BR><BR>' + 'Unfortunately, this address does not appear to be in Xcel Energy territory. Only Xcel Energy customers are eligible to subscribe to US Solar.')
						.openOn(map);
			}


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
				// workaround to remove results layer
			  map.eachLayer(function (layer) {
						if (String(layer._leaflet_id) == results_id) {
							map.removeLayer(layer);
						}
				});

			
				$('#operating-btn').toggleClass('btn-info');
				$('#operating-btn').toggleClass('btn-secondary');
			
	
				if (map.hasLayer(points_operating)) {
					map.removeLayer(points_operating);
				} else {
					points_operating.addTo(map);
				}
			});

		$('#future-btn').click(function () {
				// workaround to remove results layer
			  map.eachLayer(function (layer) {
						if (String(layer._leaflet_id) == results_id) {
							map.removeLayer(layer);
						}
				});			
			
				$('#future-btn').toggleClass('btn-info');
				$('#future-btn').toggleClass('btn-secondary');
			 	
				if (map.hasLayer(points_future)) {
					map.removeLayer(points_future);
				} else {
					points_future.addTo(map);
				}
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

