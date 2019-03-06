
//
// initiate map
//

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
	iconUrl: 'img/icon.svg',
	iconSize: [30,30]
})

var points = L.esri.featureLayer({
		url: 'https://services9.arcgis.com/YEQ7YfprtcM3j3JL/ArcGIS/rest/services/MN_CSG_2_view/FeatureServer/0',
		pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
				icon: point_icon
			});
		},
        onEachFeature: function(feature, layer) {
            layer.bindPopup(feature.properties.Name);
        }
	});

var premises = L.esri.featureLayer({
		url: 'https://services9.arcgis.com/YEQ7YfprtcM3j3JL/arcgis/rest/services/MN_CSG_2_view/FeatureServer/1',
		style: {
			weight: 1,
			color: 'orange'
		}
	});





//
// initiate layers
//

points.addTo(map);



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





    //var searchControl = L.esri.Geocoding.Controls.geosearch({expanded: true, collapseAfterResult: false, zoomToResult: false}).addTo(map);
    var searchControl = L.esri.Geocoding.geosearch({expanded: true, collapseAfterResult: false, zoomToResult: false}).addTo(map);
    
    searchControl.on('results', function(data){ 
      if (data.results.length > 0) {
        var popup = L.popup()
          .setLatLng(data.results[0].latlng)
          .setContent(data.results[0].text)
          .openOn(map);
        map.setView(data.results[0].latlng)
		console.log(data.results[0].latlng)
      }
    })







//
// jQuery listeners
//

$(document).ready(function(){
	$("#selectStandardBasemap").on("change", function(e) {
		setBasemap($(this).val());
  	});
    
    
    $('#operating-btn').click(function () {
			$('#operating-btn').toggleClass('btn-primary');
			$('#operating-btn').toggleClass('btn-secondary');	
		});
	
	$('#future-btn').click(function () {
			$('#future-btn').toggleClass('btn-primary');
			$('#future-btn').toggleClass('btn-secondary');
		});
    
	
	
	// Search
      var input = $(".geocoder-control-input");
      input.focus(function(){
        $("#panelSearch .panel-body").css("height", "150px");
      });
      input.blur(function(){
         $("#panelSearch .panel-body").css("height", "auto");
      });
      // Attach search control for desktop or mobile
      function attachSearch() {
        var parentName = $(".geocoder-control").parent().attr("id"),
          geocoder = $(".geocoder-control"),
          width = $(window).width();
        if (width <= 767 && parentName !== "geocodeMobile") {
          geocoder.detach();
          $("#geocodeMobile").append(geocoder);
        } else if (width > 767 && parentName !== "geocode"){
          geocoder.detach();
          $("#geocode").append(geocoder);
        }
      }
      $(window).resize(function() {
        attachSearch();
      });
      attachSearch();
	

});

