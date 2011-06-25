{
        "translatorID": "f8765470-5ace-4a31-b4bd-4327b960ccd",
        "label": "SpringerLink",
        "creator": "Simon Kornblith and Michael Berkowitz",
        "target": "https?://(www\\.)*springerlink\\.com|springerlink.metapress.com[^/]*/content/",
        "minVersion": "1.0.0b3.r1",
        "maxVersion": "",
        "priority": 100,
        "inRepository": true,
        "translatorType": 4,
        "lastUpdated": "2011-06-25 18:49:23"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	if((doc.title == "SpringerLink - All Search Results") || (doc.title == "SpringerLink - Journal Issue")) {
		return "multiple";
	} else if(doc.title == "SpringerLink - Book Chapter") {
		return "bookSection";
	} else if (doc.title == "SpringerLink - Book") {
		return "book";
	} else if (doc.title == "SpringerLink - Journal Article") {
		return "journalArticle";
	} else if(doc.evaluate('//span[text() = "Export Citation"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "journalArticle";
	}
}

function getCitation(doc, url) {
    // We are now on the page from where we can download the RIS
    
    var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

    var validation = doc.evaluate('//input[@id="__EVENTVALIDATION"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
    var state = doc.evaluate('//input[@id="__VIEWSTATE"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
    var form = doc.evaluate('//form[@id="LoginForm"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
    
    var params = "__EVENTVALIDATION=" + validation.value + "&" +
                 "__VIEWSTATE=" + state.value + "&" +
                 "ctl00$ctl19$SearchControl$BasicAuthorOrEditorTextBox=&ctl00$ctl19$SearchControl$BasicIssueTextBox=&ctl00$ctl19$SearchControl$BasicPageTextBox=&ctl00$ctl19$SearchControl$BasicPublicationTextBox=&ctl00$ctl19$SearchControl$BasicSearchForTextBox=&ctl00$ctl19$SearchControl$BasicVolumeTextBox=&ctl00$ctl19$cultureList=en-us&" +
                 "ctl00$ContentPrimary$ctl00$ctl00$ExportCitationButton=Export Citation" + "&" +
                 "ctl00$ContentPrimary$ctl00$ctl00$CitationManagerDropDownList=ReferenceManager" + "&" +
                 "ctl00$ContentPrimary$ctl00$ctl00$Export=AbstractRadioButton";
    params = form.action.split("?")[1] + "&" + params;
    params = encodeURI(params);
    Zotero.debug(params);
    Zotero.debug(form.action);
    Zotero.Utilities.HTTP.doPost("https://springerlink3.metapress.com/secure-login/", params, function(text) {
    	// load translator for RIS
        Zotero.debug("Posted successfully!");
        Zotero.debug(text); // FAIL!!
        
		text = text.replace("CHAPTER", "CHAP");
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			var url = urls.shift();
			var m = url.match(/https?:\/\/[^\/]+\/content\/[^\/]+\/?/);
			item.attachments = [
				{url:url, title:"SpringerLink Snapshot", mimeType:"text/html"},
				{url:m[0]+"fulltext.pdf", title:"SpringerLink Full Text PDF", mimeType:"application/pdf"}
			];
			
			var oldCreators = item.creators;
			item.creators = new Array();
			for each (var creator in oldCreators) {
				if (creator['lastName'] + creator['firstName'] != "") {
					var fName = creator['firstName'] ? creator['firstName'] : "";
					item.creators.push({firstName:Zotero.Utilities.trimInternal(fName), lastName:creator['lastName'], creatorType:"author"});
				}
			}
			
			// fix incorrect chapters
			if(item.publicationTitle && item.itemType == "book") item.title = item.publicationTitle;
			
			// fix "V" in volume
			if(item.volume) {
				item.volume = item.volume.replace("V", "");
			}
			item.complete();
		});
		translator.translate();
	}, function() { Zotero.done() });
	Zotero.wait();    
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var m = url.match(/https?:\/\/[^\/]+/);
	var host = m[0];
	
	if(detectWeb(doc, url) == "multiple") {
		var items = new Object();
		if (doc.title == "SpringerLink - Journal Issue") {
			var items = Zotero.Utilities.getItemArray(doc, doc.getElementsByTagName("table")[8], '/content/[^/]+/\\?p=[^&]+&pi=');
		} else {
			var results = doc.evaluate('//div[@class="listItemName"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
			var result;
			while (result = results.iterateNext()) {
				items[result.href] = Zotero.Utilities.trimInternal(result.textContent);
			}
		}
		items = Zotero.selectItems(items);
		if(!items) return true;
		
		var urls = new Array();
		for(var url in items) {
			urls.push(url);
		}
	} else {
		var urls = [url.replace("abstract", "export-citation/")];
        Zotero.debug(urls);
        Zotero.Utilities.processDocuments(urls, getCitation, function () { Zotero.done(); });
        //Zotero.debug(doc.evaluate('//input[@class="listItemName"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext());
	}
	
    
    /*
	var RIS = new Array();
	
	for each(var item in urls) {
		var m = item.match(/\/content\/([^/]+)/);
		RIS.push(host+"/export.mpx?code="+m[1]+"&mode=ris");
	}
	Zotero.Utilities.HTTP.doGet(RIS, function(text) {
		// load translator for RIS
		text = text.replace("CHAPTER", "CHAP");
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			var url = urls.shift();
			var m = url.match(/https?:\/\/[^\/]+\/content\/[^\/]+\/?/);
			item.attachments = [
				{url:url, title:"SpringerLink Snapshot", mimeType:"text/html"},
				{url:m[0]+"fulltext.pdf", title:"SpringerLink Full Text PDF", mimeType:"application/pdf"}
			];
			
			var oldCreators = item.creators;
			item.creators = new Array();
			for each (var creator in oldCreators) {
				if (creator['lastName'] + creator['firstName'] != "") {
					var fName = creator['firstName'] ? creator['firstName'] : "";
					item.creators.push({firstName:Zotero.Utilities.trimInternal(fName), lastName:creator['lastName'], creatorType:"author"});
				}
			}
			
			// fix incorrect chapters
			if(item.publicationTitle && item.itemType == "book") item.title = item.publicationTitle;
			
			// fix "V" in volume
			if(item.volume) {
				item.volume = item.volume.replace("V", "");
			}
			item.complete();
		});
		translator.translate();
	}, function() { Zotero.done() });
	Zotero.wait();
    */
}