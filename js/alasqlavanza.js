define(['./alasqlstockdata', './avanzacourtagecalculator'], function(alasqlstockdata, avanzacourtagecalculator) {
    
    function createDataTable() {
        alasql('CREATE TABLE IF NOT EXISTS AvanzaData (  \
                Antal INT, \
                Belopp DECIMAL, \
                Datum DATE, \
                Year SMALLINT, \
                Month SMALLINT, \
                ISIN NVARCHAR(50), \
                Konto NVARCHAR(100), \
                Kurs DECIMAL, \
                [Typ av transaktion] NVARCHAR(100), \
                Valuta NVARCHAR(10), \
                [Värdepapperbeskrivning] NVARCHAR(100)); \
                \
                CREATE INDEX KontoIndex ON AvanzaData(Konto); \
                CREATE INDEX DatumYearIndex ON AvanzaData(Year); \
                CREATE INDEX DatumMonthIndex ON AvanzaData(Month); \
                CREATE INDEX DatumYearMonthBeloppIndex ON AvanzaData(Year, Month, Belopp); \
                CREATE INDEX ISINIndex ON AvanzaData(ISIN); \
                CREATE INDEX TypAvTransaktionIndex ON AvanzaData([Typ av transaktion], ISIN, Datum); \
                CREATE INDEX VardepapperIndex ON AvanzaData([Värdepapperbeskrivning]); \
                CREATE INDEX BeloppIndex ON AvanzaData([Belopp]); \
        ');
    }

    function createPortfolioTable() {
        alasql('CREATE TABLE IF NOT EXISTS AvanzaPortfolio (  \
                Konto NVARCHAR(100)); \
                \
                CREATE INDEX KontoIndex ON AvanzaPortfolio(Konto); \
        ');
    }

    function getSelectedPortfolios() {
        return alasql('SELECT Konto FROM AvanzaPortfolio ORDER BY Konto');
    }

    function truncatePortfolioData() {
        alasql('TRUNCATE TABLE AvanzaPortfolio;');
    }

    function insertPortfolioData(konto) {
        alasql('INSERT INTO AvanzaPortfolio VALUES ("' + konto + '");');
    }

    function getBuyTransactionSumBelopp(year) {
        return alasql('SELECT VALUE SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' \
                       AND ([Typ av transaktion] = "Köp" OR [Typ av transaktion] = "Köp. rättelse")');
    }

    function getSellTransactionSumBelopp(year) {
        return alasql('SELECT VALUE SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' \
                       AND ([Typ av transaktion] = "Sälj" OR [Typ av transaktion] = "Sälj. rättelse")');
    }

    function getDividendMonthSumBelopp(year, month) {
        return alasql('SELECT VALUE SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND Month = ' + month + ' \
                       AND ([Typ av transaktion] = "Utdelning" OR [Typ av transaktion] = "Utdelning. rättelse")');
    }

    function getTaxMonthSumBelopp(year, month) {
        var result = alasql('SELECT SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND Month = ' + month + ' \
                       AND [Värdepapperbeskrivning] = "Utländsk källskatt"');

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return belopp["0"].Belopp;
    }

    function getCourtageYears() {
        return alasql('SELECT FIRST(Year) AS Year \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE ([Typ av transaktion] = "Köp" OR [Typ av transaktion] = "Sälj") \
                       GROUP BY Year \
                       ORDER BY 1');
    }

    function getDividendMaxYear() {
        return alasql('SELECT MAX(Year) AS Year \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE [Typ av transaktion] = "Utdelning"');
    }

    function getDividendYears() {
        return alasql('SELECT FIRST(Year) AS Year \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE [Typ av transaktion] = "Utdelning" \
                       GROUP BY Year \
                       ORDER BY 1');
    }

    function getBuyTransactionYears() {
        return alasql('SELECT FIRST(Year) AS Year \
                FROM AvanzaData \
                INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                WHERE [Typ av transaktion] = "Köp" \
                GROUP BY Year \
                ORDER BY 1');
    }

    function getSellTransactionYears() {
        return alasql('SELECT FIRST(Year) AS Year \
                FROM AvanzaData \
                INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                WHERE [Typ av transaktion] = "Sälj" \
                GROUP BY Year \
                ORDER BY 1');
    }

    function getTransactionYears() {
        return alasql('SELECT FIRST(Year) AS Year \
                FROM AvanzaData \
                INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                WHERE ([Typ av transaktion] = "Sälj" OR [Typ av transaktion] = "Köp") \
                GROUP BY Year \
                ORDER BY 1');
    }

    function getDepositYears() {
        return alasql('SELECT FIRST(YEAR(Datum)) AS Year \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE ([Typ av transaktion] = "Insättning" OR [Typ av transaktion] = "Uttag") \
                       GROUP BY Year \
                       ORDER BY 1');
    }

    function getDividendAll(addTaxToSum) {
        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR [Värdepapperbeskrivning] = "Utländsk källskatt"';
            
        return alasql('SELECT FIRST(Year) AS Year, SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE ([Typ av transaktion] = "Utdelning" OR [Typ av transaktion] = "Utdelning. rättelse"' + taxSqlWhere + ') \
                       GROUP BY Year \
                       ORDER BY 1');
    }

    function getDividendYearSumBelopp(year) {
        return alasql('SELECT VALUE SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' \
                       AND ([Typ av transaktion] = "Utdelning" OR [Typ av transaktion] = "Utdelning. rättelse")');
    }

    function getTaxYearSumBelopp(year) {
        return alasql('SELECT VALUE SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' \
                       AND [Värdepapperbeskrivning] = "Utländsk källskatt"');
    }

    function getDepositsYearSumBelopp(year) {
        return alasql('SELECT VALUE SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND ([Typ av transaktion] = "Insättning" OR [Typ av transaktion] = "Uttag")');
    }

    function getReceivedDividendCurrentYearToDate(year, today) {
        return alasql('SELECT LAST([Värdepapperbeskrivning]) AS [Värdepapper], LAST(ISIN) AS ISIN, FIRST(Datum) AS Datum, LAST(Antal) AS Antal, LAST(Kurs) AS Kurs, MONTH(FIRST(Datum)) AS [Månad], SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND Datum <= "' + today + '" AND ([Typ av transaktion] = "Utdelning" OR [Typ av transaktion] = "Utdelning. rättelse" OR [Värdepapperbeskrivning] = "Utländsk källskatt") \
                       GROUP BY AvanzaData.Konto, Month, ISIN')
    }

    function getTotalDividend(startPeriod, endPeriod, addTaxToSum) {
        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR [Värdepapperbeskrivning] = "Utländsk källskatt"';

        var result = alasql('SELECT SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Datum >= "' + startPeriod.toISOString().slice(0, 10) + '" AND Datum <= "' + endPeriod.toISOString().slice(0, 10) + '" AND ([Typ av transaktion] = "Utdelning" OR [Typ av transaktion] = "Utdelning. rättelse"' + taxSqlWhere + ")");

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return Math.round(belopp["0"].Belopp); 
    }

    function getVärdepapperForPeriod(startPeriod, endPeriod) {
        return alasql('SELECT DISTINCT [Värdepapperbeskrivning] AS Vardepapper, [ISIN] AS ISIN \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Datum >= "' + startPeriod.toISOString().slice(0, 10) + '" AND Datum <= "' + endPeriod.toISOString().slice(0, 10) + '" AND ([Typ av transaktion] = "Utdelning" OR [Typ av transaktion] = "Utdelning. rättelse")');
    }

    function getVärdepapperDividend(year, month, addTaxToSum) {

        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR [Typ av transaktion] = "Utländsk källskatt 15%" OR [Typ av transaktion] = "Utländsk källskatt 27%"';

        var resultQuery = alasql.compile('SELECT FIRST([ISIN]) AS [ISIN], SUM(Belopp::NUMBER) AS [Belopp] \
                       FROM AvanzaData \
                       JOIN AvanzaPortfolio USING Konto, Konto \
                       WHERE Year = ' + year + ' AND Month = ' + month + '\
                       AND ([Typ av transaktion] = "Utdelning" OR [Typ av transaktion] = "Utdelning. rättelse"' + taxSqlWhere + ') \
                       GROUP BY ISIN');

        var result = resultQuery();
                
        var resultForReturn = [];
        result.forEach(function(object) {

            if(object == null) return;
            if(object.ISIN == null) return;

            var newVardepapperObject = new Object();

            var resultNameQuery = alasql.compile('SELECT DISTINCT [Värdepapperbeskrivning] \
                       FROM AvanzaData \
                       WHERE [ISIN] = "' + object.ISIN + '" AND [Värdepapperbeskrivning] != "Utländsk källskatt" AND [Typ av transaktion] != "Prelskatt utdelningar"');

            var resultName = resultNameQuery();

            newVardepapperObject.Värdepapper = resultName["0"].Värdepapperbeskrivning;
            newVardepapperObject.Belopp = object.Belopp;

            resultForReturn.push(newVardepapperObject);
        });

        return resultForReturn;
    }

    function getVardepapperTotalDividend(startPeriod, endPeriod, addTaxToSum) {

        var avanzaIsinWithValueQuery = alasql.compile('SELECT FIRST(ISIN) AS [name], SUM(Belopp::NUMBER) AS [value] \
                                                  FROM AvanzaData \
                                                  JOIN AvanzaPortfolio USING Konto, Konto \
                                                  WHERE Datum >= "' + startPeriod.toISOString().slice(0, 10) + '" AND Datum <= "' + endPeriod.toISOString().slice(0, 10) + '" AND ([Typ av transaktion] = "Utdelning" OR [Typ av transaktion] = "Utdelning. rättelse") \
                                                  GROUP BY ISIN');

        var result = avanzaIsinWithValueQuery();
                
        var resultForReturn = [];
        result.forEach(function(object) {

            if(object == null) return;
            if(object.name == null) return;

            var newVardepapperObject = new Object();

            var avanzaVardepapperQuery = alasql.compile('SELECT DISTINCT [Värdepapperbeskrivning] \
                       FROM AvanzaData \
                       JOIN AvanzaPortfolio USING Konto, Konto \
                       WHERE [ISIN] = "' + object.name + '" AND [Värdepapperbeskrivning] != "Utländsk källskatt" AND [Typ av transaktion] != "Prelskatt utdelningar"');

            var resultName = avanzaVardepapperQuery();

            var taxValue = 0;
            if(addTaxToSum) {
                var resultTaxQuery = alasql.compile('SELECT SUM(Belopp::NUMBER) AS [value] \
                                     FROM AvanzaData \
                                     JOIN AvanzaPortfolio USING Konto, Konto \
                                     WHERE Datum >= "' + startPeriod.toISOString().slice(0, 10) + '" AND Datum <= "' + endPeriod.toISOString().slice(0, 10) + '" AND [ISIN] = "' + object.name + '" AND [Värdepapperbeskrivning] = "Utländsk källskatt" \
                                     GROUP BY ISIN');

                var resultTax = resultTaxQuery();
                
                taxValue = resultTax["0"].value;
            }

            newVardepapperObject.name = resultName["0"].Värdepapperbeskrivning;
            newVardepapperObject.value = (object.value + taxValue);

            resultForReturn.push(newVardepapperObject);
        });

        return resultForReturn;
    }

    function getBuyTransactionCount(year, month) {
        var result = alasql('SELECT COUNT(*) AS TransactionCount \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND Month = ' + month + ' \
                       AND [Typ av transaktion] = "Köp"');

        var resultMinus = alasql('SELECT COUNT(*) AS TransactionCount \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND Month = ' + month + ' \
                       AND [Typ av transaktion] = "Köp. rättelse"');

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
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND Month = ' + month + ' \
                       AND [Typ av transaktion] = "Sälj"');

        var resultMinus = alasql('SELECT COUNT(*) AS TransactionCount \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND Month = ' + month + ' \
                       AND [Typ av transaktion] = "Sälj. rättelse"');

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

    function getCourtageSumBuy(year) {

        var result = alasql('SELECT FIRST(ISIN) AS [ISIN] \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND [Typ av transaktion] = "Köp" \
                       GROUP BY ISIN');
                
        var totalCourtage = 0;
        result.forEach(function(object) {
            if(object == null) return;
            if(object.ISIN == null) return;

            var isin = object.ISIN;
            var objectCurrency = alasqlstockdata.getVärdepapperHandlas(isin);         
            if(objectCurrency !== "SEK" && (isin.startsWith("SE") == false)) return;

            var resultTransactions = alasql('SELECT Antal, Kurs, Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE [Typ av transaktion] = "Köp" AND Year = ' + year + ' AND [ISIN] = "' + isin + '"');

            resultTransactions.forEach(function(object) {
                if(Number.isInteger(object.Antal) == false) return;                
                if(object.Belopp === "-") return;

                totalCourtage += avanzacourtagecalculator.calculateBuy(object.Antal, object.Kurs, object.Belopp);
            });
            
        });

        return totalCourtage;
    }

    function getCourtageSumSell(year) {

        var result = alasql('SELECT FIRST(ISIN) AS [ISIN] \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND [Typ av transaktion] = "Sälj" \
                       GROUP BY ISIN');
                
        var totalCourtage = 0;
        result.forEach(function(object) {
            if(object == null) return;
            if(object.ISIN == null) return;

            var isin = object.ISIN;
            var objectCurrency = alasqlstockdata.getVärdepapperHandlas(isin);         
            if(objectCurrency !== "SEK" && (isin.startsWith("SE") == false)) return;

            var resultTransactions = alasql('SELECT Antal, Kurs, Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE [Typ av transaktion] = "Sälj" AND Year = ' + year + ' AND [ISIN] = "' + isin + '"');

            resultTransactions.forEach(function(object) {
                if(Number.isInteger(object.Antal) == false) return;
                if(object.Belopp === "-") return;

                totalCourtage += avanzacourtagecalculator.calculateSell(object.Antal, object.Kurs, object.Belopp);
            });
            
        });

        return totalCourtage;
    }

    function getReturnedTaxYearSumBelopp(year) {
        return alasql('SELECT VALUE SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE Year = ' + year + ' AND [Värdepapperbeskrivning] = "Återbetalning utländsk källskatt" AND [Typ av transaktion] = "Övrigt"');
    }

    function getStocksInPortfolio() {
        var result = alasql('SELECT FIRST([Värdepapperbeskrivning]) AS [Värdepapper], FIRST(AvanzaData.ISIN) AS ISIN, FIRST(handlas) AS Handlas, FIRST(StockData.bransch) AS Bransch, FIRST(StockData.yahoosymbol) AS YahooSymbol, SUM(Antal::NUMBER) AS Antal \
                            FROM AvanzaData \
                            INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                            INNER JOIN StockData ON StockData.isin = AvanzaData.ISIN \
                            WHERE ISIN != "-" AND [Typ av transaktion] != "Prelskatt utdelningar" AND [Typ av transaktion] != "Utdelning" AND [Typ av transaktion] != "Utdelning. rättelse" AND [Värdepapperbeskrivning] != "Utländsk källskatt" \
                            GROUP BY [Värdepapperbeskrivning] \
                            HAVING SUM(Antal::NUMBER) > 0 \
                            ORDER BY [Värdepapperbeskrivning]');

        var resultForReturn = [];
        result.forEach(function(object) {
            if(object == null) return;
            if(object.Antal == null) return;
            if(Number.isInteger(object.Antal) == false) return;

            var newObject = new Object();
            newObject.Värdepapper = object.Värdepapper;
            newObject.Antal = parseInt(object.Antal);
            newObject.YahooSymbol = object.YahooSymbol;
            newObject.Bransch = object.Bransch;
            newObject.Valuta = object.Handlas;
            newObject.ISIN = object.ISIN;

            resultForReturn.push(newObject);
        });
        
        return resultForReturn;
    }

    function getSymbolWithBta(symbol) {
        if(symbol.endsWith(" A") || symbol.endsWith(" B") || symbol.endsWith(" C")) {
            return symbol.substr(0,symbol.indexOf(' ')) + " BTA " + symbol.substr(symbol.length - 1);
        }

        return symbol + " BTA";
    }

    function getPurchaseBeloppValue(isin) {
        var symbolPurschaseValue = alasql('SELECT VALUE SUM(Belopp::NUMBER) \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE ISIN = "' + isin + '" \
                       AND Kurs != "-" AND Belopp != "-" AND ISIN != "-" AND [Typ av transaktion] != "Sälj. rättelse" AND [Typ av transaktion] != "Sälj" \
                       AND [Typ av transaktion] != "Prelskatt utdelningar" AND [Typ av transaktion] != "Utdelning" \
                       AND [Typ av transaktion] != "Utdelning. rättelse" AND [Värdepapperbeskrivning] != "Utländsk källskatt"');

        // Beräkna för special där belopp -
        var symbolPurschaseSplittSpecialResult = alasql('SELECT Antal, Kurs \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE ISIN = "' + isin + '" \
                       AND Belopp = "-" AND ISIN != "-" AND [Typ av transaktion] != "Sälj. rättelse" AND [Typ av transaktion] != "Sälj" \
                       AND [Typ av transaktion] != "Prelskatt utdelningar" AND [Typ av transaktion] != "Utdelning" \
                       AND [Typ av transaktion] != "Utdelning. rättelse" AND [Värdepapperbeskrivning] != "Utländsk källskatt"');

        var symbolPurschaseSplittSpecialValue = 0;
        symbolPurschaseSplittSpecialResult.forEach(function(object) {
            if(object.Kurs == "-") return;

            symbolPurschaseSplittSpecialValue += object.Antal * object.Kurs;
        });

        var symbol = alasqlstockdata.getSymbol(isin);
        var symbolWithBta = getSymbolWithBta(symbol);

        var symbolExceptionsPurchaseValue = alasql('SELECT VALUE SUM(Belopp::NUMBER) AS Belopp \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE [Värdepapperbeskrivning] = "' + symbolWithBta + '" \
                       AND Antal > 0 AND Belopp != "-"');

        return (Math.abs(symbolPurschaseValue) + Math.abs(symbolExceptionsPurchaseValue) + Math.abs(symbolPurschaseSplittSpecialValue));
    }

    function getPurchaseAntalValue(isin) {
        var symbol = alasqlstockdata.getSymbol(isin);
        var symbolWithBta = getSymbolWithBta(symbol);

        var symbolPurschaseAntalValue = alasql('SELECT VALUE SUM(Antal::NUMBER) \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE ISIN = "' + isin + '" \
                       AND Kurs != "-" AND Belopp != "-" AND ISIN != "-" AND [Typ av transaktion] != "Sälj. rättelse" AND [Typ av transaktion] != "Sälj" AND [Typ av transaktion] != "Prelskatt utdelningar" AND [Typ av transaktion] != "Utdelning" AND [Typ av transaktion] != "Utdelning. rättelse" AND [Värdepapperbeskrivning] != "Utländsk källskatt"');

        var symbolPurschaseSplittSpecialResult = alasql('SELECT Antal \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE ISIN = "' + isin + '" \
                       AND Belopp = "-" AND ISIN != "-" AND [Typ av transaktion] != "Sälj. rättelse" AND [Typ av transaktion] != "Sälj" \
                       AND [Typ av transaktion] != "Prelskatt utdelningar" AND [Typ av transaktion] != "Utdelning" \
                       AND [Typ av transaktion] != "Utdelning. rättelse" AND [Värdepapperbeskrivning] != "Utländsk källskatt"');

        var symbolPurschaseSplittSpecialValue = 0;
        symbolPurschaseSplittSpecialResult.forEach(function(object) {
            if(object.Antal == "-") return;

            symbolPurschaseSplittSpecialValue += object.Antal;
        });

        var symbolExceptionsPurchaseAntalValue = alasql('SELECT VALUE SUM(Antal::NUMBER) AS Antal \
                       FROM AvanzaData \
                       INNER JOIN AvanzaPortfolio ON AvanzaPortfolio.Konto = AvanzaData.Konto \
                       WHERE [Värdepapperbeskrivning] = "' + symbolWithBta + '" \
                       AND Antal > 0 AND Belopp != "-"');

        return (Math.abs(symbolPurschaseAntalValue) + Math.abs(symbolExceptionsPurchaseAntalValue) + Math.abs(symbolPurschaseSplittSpecialValue));
    }

    function hasDataTableRows() {
        var resultCount = alasql('SELECT VALUE COUNT(*) FROM AvanzaData');
        return resultCount == 0 ? false : true;
    }

    return {
        createDataTable: createDataTable,
        createPortfolioTable: createPortfolioTable,
        insertPortfolioData: insertPortfolioData,
        truncatePortfolioData: truncatePortfolioData,
        getStocksInPortfolio: getStocksInPortfolio,
        getSelectedPortfolios: getSelectedPortfolios,
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
        getDividendAll: getDividendAll,
        getVärdepapperDividend: getVärdepapperDividend,
        getVärdepapperForPeriod: getVärdepapperForPeriod,
        getBuyTransactionSumBelopp: getBuyTransactionSumBelopp,
        getSellTransactionSumBelopp: getSellTransactionSumBelopp,
        getTransactionYears: getTransactionYears,
        getCourtageYears: getCourtageYears,
        getCourtageSumBuy: getCourtageSumBuy,
        getCourtageSumSell: getCourtageSumSell,
        getReturnedTaxYearSumBelopp: getReturnedTaxYearSumBelopp,
        getReceivedDividendCurrentYearToDate: getReceivedDividendCurrentYearToDate,
        getPurchaseBeloppValue: getPurchaseBeloppValue,
        getPurchaseAntalValue: getPurchaseAntalValue,
        hasDataTableRows: hasDataTableRows
    };
});