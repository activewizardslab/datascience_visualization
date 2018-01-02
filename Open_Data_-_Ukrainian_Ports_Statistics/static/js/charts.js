$(function() {
    // Menu buttons
    $("#select_sankey").on("click", function() {
        $("#select_sankey").removeClass("inactive-button");
        $("#select_stacked_bar").addClass("inactive-button");
        $("#sankey_panel").css("display", "block");
        $("#stacked_bar_panel").css("display", "none");
        get_sankey_diagram_data();
    });

    $("#select_stacked_bar").on("click", function() {
        $("#select_sankey").addClass("inactive-button");
        $("#select_stacked_bar").removeClass("inactive-button");
        $("#sankey_panel").css("display", "none");
        $("#stacked_bar_panel").css("display", "block");
        get_stacked_bar_chart_data();
    });

    // Sankey diagram filter panel
    $('#clear_sankey_filters').on('click', function() {
        $("#Year").val($("#Year").data("default"));
        $("#Month").val($("#Month").data("default"));
        $("#Operator").val($("#Operator").data("default"));
        $("#Direction").val($("#Direction").data("default"));
        get_sankey_diagram_data();
    });
    $('#Year, #Month, #Operator, #Direction').on('change', function() {
        if ($("#Year").val() != $("#Year").data("default")) {
            $("#Month").prop('disabled', false);
        }
        else {
            $("#Month").prop('disabled', 'disabled');
            $("#Month").val($("#Month").data("default"));
        }
        get_sankey_diagram_data();
    });

    // Stacked bar chart filter panel
    $('#clear_stacked_filters').on('click', function() {
        $("#Port").val($("#Port").data("default"));
        $("#Bert").val($("#Bert").data("default"));
        $("#Direction2").val($("#Direction2").data("default"));
        get_stacked_bar_chart_data();
    });
    $('#Bert, #Direction2').on('change', function() {
        get_stacked_bar_chart_data();
    });
    $('#Port').on('change', function() {
        $.ajax({
            url: "/update_berts_list",
            type: "GET",
            data: {
                port: $("#Port :selected").text()
            },
            success: function(data) {
                $("#Bert > option").remove();
                $("#Bert").append("<option>" + $("#Bert").data("default") + "</option>");
                $.each(data.berts, function(d) {
                    $("#Bert").append("<option>" + d + "</option>");
                });
            }
        });
        get_stacked_bar_chart_data();
    });

    get_sankey_diagram_data();
});

// Update sankey diagram
function get_sankey_diagram_data() {
    $.ajax({
        url: "/sankey_filter",
        type: "GET",
        data: {
            year: $("#Year :selected").text(),
            month: $("#Month :selected").text(),
            operator: $("#Operator :selected").text(),
            direction: $("#Direction :selected").text()
        },
        success: function(data) {
            $(".tooltip").remove();
            $(".sankey").remove();
            if (data.nodes != 0 && data.links != 0) {
                render_sankey_chart(data);
            } else {
                $('#noDataModal').modal("show");
            }
        }
    });
}

// Update stacked bar chart
function get_stacked_bar_chart_data() {
    $.ajax({
        url: "/stacked_bar_filter",
        type: "GET",
        data: {
            port: $("#Port :selected").text(),
            direction: $("#Direction2 :selected").text(),
            bert: $("#Bert :selected").text()
        },
        success: function(data) {
            $(".tooltip").remove();
            $(".stacked_bar").remove();
            if (data != 0) {
                render_stacked_bar(data.data, data.all_shipment, data.shortMonths, data.title);
            } else {
                $('#noDataModal').modal("show");
            }
        }
    });
}

/* SANKEY DIAGRAM: START */
function render_sankey_chart(data) {
    var margin = {top: 10, right: 10, bottom: 10, left: 10},
    width = $('#sankey_chart').width() - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

    var isIE = /*@cc_on!@*/false || !!document.documentMode;   // At least IE6
    if (isIE) {
        $('#sankey_chart').css('height', 700);
        $('#sankey_chart').css('width', 700)
    }

    var formatNumber = d3.format(",.3f"),    // zero decimal places
        format = function(d) { return formatNumber(d); },
        color = d3.scale.category20();

    // append the svg canvas to the page
    var svg = d3.select("#sankey_chart").append("svg").classed('sankey', true)
        .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
        .attr("preserveAspectRatio", "xMidYMid")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Set the sankey diagram properties
    var sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(20)
        .size([width, height]);

    var path = sankey.link();

    // load the data
    sankey
        .nodes(data.nodes)
        .links(data.links)
        .layout(32);

    // Define the div for the tooltip
    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // add in the links
    var phrase = "empty for now";
    var link = svg.append("g").selectAll(".link")
        .data(data.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("value", function(d) {
            return d.value;
        })
        .attr("port", function(d) {return d.source;})
        .attr("shipment", function(d) {return d.target;})
        .attr("d", path)
        .attr("stroke", function(d,i) {
            return d.color = color(i); })
        .attr("stroke-opacity", "0.2")
        .attr("fill", "none")
        .on("mousemove", function(d){
            div.transition().duration(200).style("opacity", .9);
            div.html([
                    "<strong>" + data.popup,
                    parseFloat($(this).attr("value")).toLocaleString('en-US') + "</strong><br>",
                ].join(''))
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            div.transition().duration(300).style("opacity", 0);
        })
        .on("mouseleave", function(d) {
            div.transition().duration(300).style("opacity", 0);
        })
        .style("stroke-width", function(d) {return Math.max(1.8, d.dy); })
        .sort(function(a, b) {return b.dy - a.dy; });

    // add in the nodes
    var node = svg.append("g").selectAll(".node")
        .data(data.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")"; })
        .call(d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function() {
            this.parentNode.appendChild(this); })
        .on("drag", dragmove));

    // add the rectangles for the nodes
    node.append("rect")
        .attr("height", function(d) { return d.dy; })
        .attr("width", sankey.nodeWidth())
        .style("fill", function(d) {
            return d.color = color(d.name.replace(/ .*/, "")); })
        .style("stroke", function(d) {
            return d3.rgb(d.color).darker(2); })
        .append("title")
        .text(function(d) {
            return d.name + "\n" + format(d.value); });

    // add in the title for the nodes
    node.append("text")
        .attr("x", -6)
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("transform", null)
        .text(function(d) { return d.name; })
        .filter(function(d) { return d.x < width / 2; })
        .attr("x", 6 + sankey.nodeWidth())
        .attr("text-anchor", "start");

    // the function for moving the nodes
    function dragmove(d) {
        d3.select(this).attr("transform",
            "translate(" + d.x + "," + (
                    d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
                ) + ")");
        sankey.relayout();
        link.attr("d", path);
    }
}
/* SANKEY DIAGRAM: END */

/* STACKED BAR CHART: START */
function render_stacked_bar(data, all_shipment, shortMonths, title) {
    var myFormatters = d3.locale({
        "decimal": ".",
        "thousands": ",",
        "grouping": [3],
        "currency": ["$", ""],
        "dateTime": "%a %b %e %X %Y",
        "date": "%m/%d/%Y",
        "time": "%H:%M:%S",
        "periods": ["AM", "PM"],
        "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        "shortMonths": shortMonths
    });
    d3.time.format = myFormatters.timeFormat;

    var main_height = 700,
        bottom_height = 70,
        margin = {top: 10, right: 30, bottom: 100, left: 55},
        margin2 = {top: main_height-bottom_height, right: 30, bottom: 20, left: 55},
        width = $('#stached_bar_chart').width() - margin.left - margin.right,
        height = main_height - margin.top - margin.bottom,
        height2 = main_height - margin2.top - margin2.bottom;

    var parseDate = d3.time.format("%m/%Y").parse;

    var colors = d3.scale.category20b().domain(all_shipment);

    data.forEach(function(d) {
        var y0 = 0;
        d.column = d.values.map(function(u) { return {name: u.name, y0: y0, y1: y0 += +u.value, date: parseDate(d.date), value: u.value}; });
        d.total = d.column.length != 0 ? d.column[d.column.length - 1].y1 : 0;
        return {date: d.date, column: d.column, total: d.total};
    });
    data = data.map(function(d) {
        d.date = parseDate(d.date);
        return d;
    });

    var x = d3.time.scale().range([0, width]),
        x2 = d3.time.scale().range([0, width]),
        y = d3.scale.linear().range([height, 0]),
        y2 = d3.scale.linear().range([height2, 0]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(d3.time.format("%b %Y")),
        xAxis2 = d3.svg.axis().scale(x2).orient("bottom").tickFormat(d3.time.format("%b %Y")),
        yAxis = d3.svg.axis().scale(y).orient("left");

    var brush = d3.svg.brush().x(x2)
        .on("brush", brushed);

    var area = d3.svg.area()
        .interpolate("monotone")
        .x(function (d) { return x(d.date); })
        .y0(height)
        .y1(function (d) {return y(d.total); });

    var area2 = d3.svg.area()
        .interpolate("monotone")
        .x(function (d) { return x2(d.date); })
        .y0(height2)
        .y1(function (d) { return y2(d.total); });

    var svg = d3.select("#stached_bar_chart").append("svg").classed('stacked_bar', true)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    var date_range = data.map(function (d) {return d.date; });
    var max_date = d3.max(date_range);
    date_range.push(d3.time.month.offset(max_date, 1));
    data.push({"date": d3.time.month.offset(max_date, 1), "total": 0, "column": []});

    x.domain(d3.extent(date_range));
    y.domain([0, d3.max(data.map(function (d) {return d.total; }))]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    focus.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);

    focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    var dates = data.map(function(d) {return d.date; });
    var barWidth = d3.scale.ordinal()
        .domain(dates)
        .rangeRoundBands(x.range(), 0.05)
        .rangeBand();
    var mini_barWidth = d3.scale.ordinal()
        .domain(dates)
        .rangeRoundBands(x2.range(), 0.05)
        .rangeBand();

    var bar = focus.selectAll('.bar')
        .data(data)
        .enter()
        .append("g")
        .classed("main_bar", true);

    bar.selectAll("rect")
        .data(function(d) { return d.column; })
        .enter().append("rect")
        .attr('class', 'bar')
        .attr('x', function(d) { return x(d.date) - barWidth / 2; })
        .attr('width', barWidth)
        .attr("y", function(d) { return y(d.y1); })
        .attr('height', function(d) { return y(d.y0) - y(d.y1); })
        .attr('fill', function(d) { return colors(d.name); })
        .attr('opacity', 0.85)
        .on("mousemove", function (d) {
            div.transition().duration(200).style("opacity", .95);
            div.html("<strong><span style='color: darkred; text-decoration: underline'>" + d.name + "</span></br>" + title + ": " + d.value + "</strong><br>")
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            d3.select(this).style("opacity", '1');
        })
        .on("mouseout", function (d) {
            div.transition().duration(300).style("opacity", 0);
            d3.select(this).style("opacity", '0.85');
        });

    focus.append("g")
        .attr("class", "left")
        .attr("transform", "translate(" + (-margin.left) + ",0)")
        .append("rect")
        .attr("width", margin.left)
        .attr('height', height)
        .attr("fill", "#f9f9ff");

    focus.append("g")
        .attr("class", "right")
        .attr("transform", "translate(" + width + ",0)")
        .append("rect")
        .attr("width", margin.right)
        .attr("y", 0)
        .attr('height', height)
        .attr("fill", "#f9f9ff")

    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(title)
        .attr("class", "y_label");

    context.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area2);

    context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

    var mini_bar = context.selectAll('.bar')
        .data(data)
        .enter()
        .append("g")
        .classed("main_bar", true);

    mini_bar.selectAll("rect")
        .data(function(d) { return d.column; })
        .enter().append("rect")
        .attr('class', 'mini-bar')
        .attr('x', function(d) { return x2(d.date) - mini_barWidth / 2; })
        .attr('width', mini_barWidth)
        .attr("y", function(d) { return y2(d.y1); })
        .attr('height', function(d) { return y2(d.y0) - y2(d.y1); })
        .attr('fill', function(d) { return colors(d.name); });

    context.append("g")
        .attr("class", "x brush")
        .call(brush)
        .selectAll("rect")
        .attr("y", -6)
        .attr("height", height2 + 7);

    function brushed() {
        x.domain(brush.empty() ? x2.domain() : brush.extent());
        var d1Y = x.domain()[0].getFullYear(),
                d2Y = x.domain()[1].getFullYear(),
                d1M = x.domain()[0].getMonth(),
                d2M = x.domain()[1].getMonth();
        var months = (d2M+12*d2Y)-(d1M+12*d1Y);
        if (months < 12) { xAxis.ticks(d3.time.months, 1) }
        else { xAxis.ticks(d3.time.months, 3) }

        focus.select(".area").attr("d", area);
        var extent = brush.extent(); //returns [xMin, xMax]
        var rangeExtent = [x2( extent[0] ), x2( extent[1] ) ]; //convert
        var rangeWidth  = rangeExtent[1] - rangeExtent[0];
        var ratio = rangeWidth != 0 ? width / rangeWidth : 1;
        bar.selectAll("rect")
            .attr('x', function(d) { return x(d.date) - barWidth * ratio / 2; })
            .attr('width', barWidth * ratio);
        focus.select(".x.axis").call(xAxis);
    }
}
/* STACKED BAR CHART: END */