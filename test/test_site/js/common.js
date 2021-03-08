const VendorTitles = ['Vendor', 'Model', 'Serial', 'Firmware'];

function requestDataFromBoard(url, c) {
    request(new XMLHttpRequest());
    function request(xhr) {

        xhr.open('GET', url, false);
        xhr.onreadystatechange = function () {
            if (xhr.readyState != 4) {
                return;
            }
            c(xhr.responseText);
        }
        xhr.send();
    }
}

function sendJSONToBoard(json, url, c) {
    let xhr = new XMLHttpRequest();

    xhr.open("POST", url, false)
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            c(xhr.responseText);
        } else {
            console.log(xhr.status);
            c(xhr.status);
        }
    }
    xhr.send(json);
}

function showVendorInfo(footerInfo) {
    let vendorInfoBlock = document.createElement('div');
    let element = document.querySelector(".as1-wrap__footer");
    let info = "";
    element.innerHTML = "";
    vendorInfoBlock.className = "as1-wrap__footer_text";
    for (let i = 0; i < VendorTitles.length; i++) {
        if (i != 0) {
            info += " | ";
        }
        info += VendorTitles[i] + ": " + footerInfo[VendorTitles[i]];
    }
    vendorInfoBlock.innerHTML = info;
    element.appendChild(vendorInfoBlock);
    document.title = footerInfo['Model']+"~"+footerInfo['Serial'];
}