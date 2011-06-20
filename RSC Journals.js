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
        "lastUpdated": "2011-06-18 19:57:41"
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
            case "citation_journal_title": if (!newItem.publicationTitle) newItem.publicationTitle = value; break;
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
            case "citation_fulltext_html_url": newItem.attachments.push({url:value, title:"RSC Full Text HTML", snapshot:true}); break;
            case "citation_pdf_url": newItem.attachments.push({url:value, title:"RSC Full Text PDF", snapshot:true}); break;
            
            default:
                Zotero.debug("Ignoring meta tag: " + tag + " => " + value);
        }
    }
    
    if (html) newItem.attachments.push({url:html, title:"RSC Full Text HTML"});
    
    if (pages[0] && pages[1]) newItem.pages = pages.join('-')
    else newItem.pages = pages[0] ? pages[1] : (pages[1] ? pages[1] : "");

    // Abstracts don't seem to come with
    var abstractNode = doc.evaluate('//label[@id="lblAbstractValue"]/p', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
    if (abstractNode) newItem.abstractNote = Zotero.Utilities.trimInternal(abstractNode.textContent);
    
    newItem.complete();
}

// Notes:
// (1) Even for old articles where no HTML version is available
//     a HTML full text snapshot is made, as it is difficult
//     to tell whether this is the case.

function doWeb(doc, url)    {
    scrape(doc, url);
}
