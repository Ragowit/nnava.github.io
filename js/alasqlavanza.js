define(['./alasql.min'], function(alasqlhelper) {
    
    var sourceData;

    function setSourceData(fieldValue) {
        if(fieldValue.length == 0)
            sourceData = [];
        else 
            sourceData = JSON.parse(fieldValue);
    }

    function getDividendMonthSumBelopp(year, month) {
        var result = alasql('SELECT SUM(Belopp::NUMBER) AS Belopp \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' AND MONTH(Datum) = ' + month + ' \
                       AND [Typ av transaktion] = "Utdelning" \
                       GROUP BY YEAR(Datum), MONTH(Datum)', [sourceData]);

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return belopp["0"].Belopp;
    }

    function getTaxMonthSumBelopp(year, month) {
        var result = alasql('SELECT SUM(Belopp::NUMBER) AS Belopp \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' AND MONTH(Datum) = ' + month + ' \
                       AND [Värdepapperbeskrivning] = "Utländsk källskatt" \
                       GROUP BY YEAR(Datum), MONTH(Datum)', [sourceData]);

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return belopp["0"].Belopp;
    }

    function getDividendMaxYear() {
        return alasql('SELECT MAX(YEAR(Datum)) AS Ar \
                       FROM ? \
                       WHERE [Typ av transaktion] = "Utdelning"', [sourceData]);
    }

    function getDividendYears() {
        return alasql('SELECT FIRST(YEAR(Datum)) AS Ar \
                       FROM ? \
                       WHERE [Typ av transaktion] = "Utdelning" \
                       GROUP BY YEAR(Datum) \
                       ORDER BY 1', [sourceData]);
    }

    function getBuyTransactionYears() {
        return alasql('SELECT FIRST(YEAR(Datum)) AS Year \
                FROM ? \
                WHERE [Typ av transaktion] = "Köp" \
                GROUP BY YEAR(Datum) \
                ORDER BY 1', [sourceData]);
    }

    function getSellTransactionYears() {
        return alasql('SELECT FIRST(YEAR(Datum)) AS Year \
                FROM ? \
                WHERE [Typ av transaktion] = "Sälj" \
                GROUP BY YEAR(Datum) \
                ORDER BY 1', [sourceData]);
    }

    function getDepositYears() {
        return alasql('SELECT FIRST(YEAR(Datum)) AS Ar \
                       FROM ? \
                       WHERE ([Typ av transaktion] = "Insättning" OR [Typ av transaktion] = "Uttag") \
                       GROUP BY YEAR(Datum) \
                       ORDER BY 1', [sourceData]);
    }

    function getDividendAll(addTaxToSum) {
        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR [Värdepapperbeskrivning] = "Utländsk källskatt"';
            
        return alasql('SELECT FIRST(YEAR(Datum)) AS Year, SUM(Belopp::NUMBER) AS Belopp \
                       FROM ? \
                       WHERE ([Typ av transaktion] = "Utdelning"' + taxSqlWhere + ') \
                       GROUP BY YEAR(Datum) \
                       ORDER BY 1', [sourceData]);
    }

    function getDividendYearSumBelopp(year) {
        var result = alasql('SELECT SUM(Belopp::NUMBER) AS Belopp \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' \
                       AND [Typ av transaktion] = "Utdelning" \
                       GROUP BY YEAR(Datum)', [sourceData]);

        var belopp = JSON.parse(JSON.stringify(result));

        return belopp["0"].Belopp;
    }

    function getTaxYearSumBelopp(year) {
        var result = alasql('SELECT SUM(Belopp::NUMBER) AS Belopp \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' \
                       AND [Värdepapperbeskrivning] = "Utländsk källskatt" \
                       GROUP BY YEAR(Datum)', [sourceData]);

        var belopp = JSON.parse(JSON.stringify(result));

        return belopp["0"].Belopp;
    }

    function getDepositsYearSumBelopp(year) {
        var result = alasql('SELECT FIRST(YEAR(Datum)) AS Ar, SUM(Belopp::NUMBER) AS Belopp \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' AND ([Typ av transaktion] = "Insättning" OR [Typ av transaktion] = "Uttag") \
                       GROUP BY YEAR(Datum)', [sourceData]);

        var belopp = JSON.parse(JSON.stringify(result));

        return belopp["0"].Belopp;
    }

    function getTotalDividend(year, addTaxToSum) {
        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR [Värdepapperbeskrivning] = "Utländsk källskatt"';

        var result = alasql('SELECT SUM(Belopp::NUMBER) AS Belopp \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' AND ([Typ av transaktion] = "Utdelning"' + taxSqlWhere + ")", [sourceData]);

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return Math.round(belopp["0"].Belopp); 
    }

    function getVardepapperTotalDividend(year, addTaxToSum) {
        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR [Värdepapperbeskrivning] = "Utländsk källskatt"';

        var result = alasql('SELECT FIRST(ISIN) AS [name], SUM(Belopp::NUMBER) AS [value] \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' AND ([Typ av transaktion] = "Utdelning"' + taxSqlWhere + ') \
                       GROUP BY ISIN', [sourceData]);
                
        var resultForReturn = [];
        result.forEach(function(object) {

            if(object == null) return;
            if(object.name == null) return;

            var newVardepapperObject = new Object();

            var resultName = alasql('SELECT DISTINCT [Värdepapperbeskrivning] \
                       FROM ? \
                       WHERE [ISIN] = "' + object.name + '" AND [Värdepapperbeskrivning] != "Utländsk källskatt"', [sourceData]);

            newVardepapperObject.name = resultName["0"].Värdepapperbeskrivning;
            newVardepapperObject.value = object.value;

            resultForReturn.push(newVardepapperObject);
        });

        return resultForReturn;
    }

    function getBuyTransactionCount(year, month) {
        var result = alasql('SELECT COUNT(*) AS TransactionCount \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' AND MONTH(Datum) = ' + month + ' \
                       AND [Typ av transaktion] = "Köp"', [sourceData]);

        var resultMinus = alasql('SELECT COUNT(*) AS TransactionCount \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' AND MONTH(Datum) = ' + month + ' \
                       AND [Typ av transaktion] = "Köp, rättelse"', [sourceData]);

        var countMinusValue = 0;
        var countMinus = JSON.parse(JSON.stringify(resultMinus));
        if(countMinus["0"].TransactionCount == null) 
            countMinusValue = 0
        else
            countMinusValue = countMinus["0"].TransactionCount;

        var count = JSON.parse(JSON.stringify(result));
        if(count["0"].TransactionCount == null) return 0;

        return parseInt(count["0"].TransactionCount) - parseInt(countMinusValue);
    }

    function getSellTransactionCount(year, month) {
        var result = alasql('SELECT COUNT(*) AS TransactionCount \
                       FROM ? \
                       WHERE YEAR(Datum) = ' + year + ' AND MONTH(Datum) = ' + month + ' \
                       AND [Typ av transaktion] = "Sälj"', [sourceData]);

        var count = JSON.parse(JSON.stringify(result));
        if(count["0"].TransactionCount == null) return 0;

        return parseInt(count["0"].TransactionCount);
    }

    return {
        setSourceData: setSourceData,
        getDividendMaxYear: getDividendMaxYear,
        getDividendYears: getDividendYears,
        getDividendMonthSumBelopp: getDividendMonthSumBelopp,
        getTaxMonthSumBelopp: getTaxMonthSumBelopp,
        getDividendYearSumBelopp: getDividendYearSumBelopp,
        getTotalDividend: getTotalDividend,
        getVardepapperTotalDividend: getVardepapperTotalDividend,
        getTaxYearSumBelopp: getTaxYearSumBelopp,
        getDepositsYearSumBelopp: getDepositsYearSumBelopp,
        getDepositYears: getDepositYears,
        getBuyTransactionYears: getBuyTransactionYears,
        getBuyTransactionCount: getBuyTransactionCount,
        getSellTransactionYears: getSellTransactionYears,
        getSellTransactionCount: getSellTransactionCount,
        getDividendAll: getDividendAll
    };
});