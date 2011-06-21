{
        "translatorID": "ea992d57-5742-4756-b6f7-601c8e21d040",
        "label": "RSC Journals",
        "creator": "Noel O'Boyle",
        "target": "http://pubs\\.rsc\\.org/",
        "minVersion": "1.0.0b3.r1",
        "maxVersion": "",
        "priority": 100,
        "inRepository": true,
        "translatorType": 4,
        "lastUpdated": "2011-06-21 17:03:06"
}

function detectWeb(doc, url)    {
    var namespace=doc.documentElement.namespaceURI;
    var nsResolver=namespace?function(prefix)    {
        return (prefix=="x")?namespace:null;
    }:null;

    //Single
    var xpath='//meta[@name="citation_fulltext_html_url"]';
    if (doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) 
        return "journalArticle";
      
    // Multiple
    if(doc.evaluate('//div[2]/div[5]/div[@class="search_result_wrapper"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext())
        return "multiple";

    return false;
}

// The following is adapted from IEEE Xplore.js
function scrape(doc,url) {
    var namespace = doc.documentElement.namespaceURI;
    var nsResolver = namespace ? function(prefix) {
        if (prefix == 'x') return namespace; else return null;
    } : null;
       
    var newItem=new Zotero.Item("journalArticle");
    newItem.url = doc.location.href;
    var temp;
    var xpath;
    var row;
    var rows;

    newItem.attachments = [];
    var metaTags = doc.getElementsByTagName("meta");

    var pages = [false, false];
    var doi = false;
    var pdf = false;
    var html = false;
    for (var i = 0; i< metaTags.length; i++) {
        var tag = metaTags[i].getAttribute("name");
        var value = metaTags[i].getAttribute("content");
        switch (tag) {
            case "citation_journal_title": if (!newItem.journalAbbreviation) newItem.journalAbbreviation = value; break;
            case "citation_author":
                newItem.creators.push(Zotero.Utilities.cleanAuthor(value, "author")); break;
            case "citation_title": if (!newItem.title) newItem.title = value; break;
            case "DC.publisher": if (!newItem.publisher) newItem.publisher = value; break;
            case "citation_date": if (!newItem.date && value != "NaN" && value != "") newItem.date = value; break;
            case "citation_year": if (!newItem.date && value != "NaN" && value != "") newItem.date = value; break;
            case "citation_volume": if (!newItem.volume && value != "NaN" && value != "") newItem.volume = value; break;
            case "citation_issue": if (!newItem.issue && value != "NaN" && value != "") newItem.issue = value; break;
            case "citation_firstpage": if (!pages[0] && value != "NaN" && value != "") pages[0] = value; break;
            case "citation_lastpage": if (!pages[1] && value != "NaN" && value != "") pages[1] = value; break;
            case "citation_doi": if (!newItem.DOI) newItem.DOI = value; break;
            case "citation_abstract_html_url": newItem.attachments.push({url:value, title:"RSC Abstract Record", snapshot:true}); break;
            case "citation_keywords": newItem.tags.push(value); break;
            case "citation_fulltext_html_url": 
                var noHTMLNode = doc.evaluate('//label[@class="disabled_link" and @title="Rich HTML"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
                if (!noHTMLNode) newItem.attachments.push({url:value, title:"RSC Full Text HTML", snapshot:true});
                break;
            case "citation_pdf_url":
                var noPDFNode = doc.evaluate('//label[@class="disabled_link" and @title="PDF"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();            
                if (!noPDFNode) newItem.attachments.push({url:value, title:"RSC Full Text PDF", snapshot:true});
                break;
            
            default:
                Zotero.debug("Ignoring meta tag: " + tag + " => " + value);
        }
    }
    
    if (pages[0] && pages[1]) newItem.pages = pages.join('-')
    else newItem.pages = pages[0] ? pages[1] : (pages[1] ? pages[1] : "");

    var abstractNode = doc.evaluate('//label[@id="lblAbstractValue"]/p', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
    if (abstractNode) newItem.abstractNote = Zotero.Utilities.trimInternal(abstractNode.textContent);
    
    newItem.publicationTitle = newItem.journalAbbreviation;
    var journalTitle = doc.evaluate('//div[@class="chem_soc_title"]/div/h2/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
    if (journalTitle) newItem.publicationTitle = Zotero.Utilities.trimInternal(journalTitle.textContent);
    
    newItem.complete();
}

function doWeb(doc, url)    {

    var pageType = detectWeb(doc, url);
    if (pageType == "journalArticle") {
        // Is it the abstract page or is it the full text HTML page?
        if (url.indexOf("/articlehtml/") == -1) // Abstract page
            scrape(doc, url); 
        else { // Full text HTML
            url = url.replace(/\/articlehtml\//, "\/ArticleLanding\/");
            Zotero.Utilities.processDocuments([url], scrape, function () { Zotero.done(); });
            Zotero.wait();
        }
    }
    else { // Multiple
        var namespace = doc.documentElement.namespaceURI;
        var nsResolver = namespace ? function(prefix) {
        if (prefix == 'x') return namespace; else return null;
            } : null;
        var items = new Array();
        var titles = doc.evaluate('//div[@class="title_text_s4_jrnls"]/h2/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
        var anchor;
        while (anchor=titles.iterateNext()) {
            items[anchor.href] = Zotero.Utilities.trimInternal(anchor.textContent);
        }
        items = Zotero.selectItems(items); // Show select box
        if (!items) return true;
    	var urls = new Array();
		for(var url in items)
			urls.push(url);
		Zotero.Utilities.processDocuments(urls, scrape, function () { Zotero.done(); });
		Zotero.wait();        
    }
}
