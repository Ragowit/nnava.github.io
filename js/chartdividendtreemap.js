define(['./alasql.min', './alasqlavanza', './alasqlnordnet', './monthstaticvalues'], function(alasqlhelper, alasqlavanza, alasqlnordnet, monthstaticvalues) {

    var chartData;
    var totalBelopp;
    var chartId;

    function setChartId(fieldId) {
        chartId = fieldId;
    }

    function setChartData(avanzaValue, nordnetValue) {

        alasqlnordnet.setSourceData(nordnetValue);
        alasqlavanza.setSourceData(avanzaValue);

        var resultNordnetTotal = alasqlnordnet.getTotalDividend();
        var resultAvanzaTotal = alasqlavanza.getTotalDividend();

        var beloppAvanza = JSON.parse(JSON.stringify(resultAvanzaTotal));

        totalBelopp = resultNordnetTotal + parseInt(beloppAvanza["0"].Belopp);

        var resultNordnetDividend = alasqlnordnet.getVardepapperTotalDividend();
        var resultAvanzaDividend = alasqlavanza.getVardepapperTotalDividend();

        var avanzaDividendDataItems = [ { name: 'Avanza totalt: ' + kendo.toString(parseInt(beloppAvanza["0"].Belopp), "#,0 kr"), value: parseInt(beloppAvanza["0"].Belopp), items: resultAvanzaDividend }]
        var nordnetDividendDataItems = [ { name: 'Nordnet totalt: ' + kendo.toString(resultNordnetTotal, "#,0 kr"), value: resultNordnetTotal, items: resultNordnetDividend }]

        chartData = avanzaDividendDataItems.concat(nordnetDividendDataItems);
    }

    function loadChart() {
        $(chartId).kendoTreeMap({
            dataSource: {
                data: [{
                    name: 'Utdelningar totalt: ' + kendo.toString(totalBelopp, "#,0 kr"),
                    value: kendo.toString(totalBelopp, "#,0 kr"),
                    items: chartData
                }]
            },
            valueField: "value",
            textField: "name",
            theme: "bootstrap"
        });

        $(chartId).kendoTooltip({
            filter: ".k-leaf,.k-treemap-title",
            position: "top",
            content: function (e) {
                var treemap = $(chartId).data("kendoTreeMap");
                var item = treemap.dataItem(e.target.closest(".k-treemap-tile"));
                return item.name + ": " + kendo.toString(item.value, "#,0 kr");
            }
        });
    }

    return {
        setChartId: setChartId,
        setChartData: setChartData,
        loadChart: loadChart
    };
});