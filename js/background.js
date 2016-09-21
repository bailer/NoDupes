var itemsByNotificationId = {};
var itemsByExistingId = {};
var searchedItems = {};

chrome.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
  var searchFilter = {
    state: "complete",
    exists: true, 
    query: [downloadItem.filename]
  };
  chrome.downloads.search(searchFilter, function (downloadItems) {
    bkg.console.log(downloadItems);
    var foundFile = false;
      for (i = 0; i <  downloadItems.length; i++) {
        if (downloadItems[i].fileSize == downloadItem.fileSize) {
          foundFile = true;
          chrome.downloads.pause(downloadItem.id);
          itemsByExistingId[downloadItems[i].id] = {exists: true};
          chrome.notifications.create({
            type: "basic",
            iconUrl: "images/icon128.png",
            title: "File already exists",
            message: "It seems like the file " + downloadItem.filename + " already exists",
            contextMessage: "Click to show the file",
            isClickable: true,
            buttons: [{title: "Open existing file", iconUrl: "images/open.png"},{title: "Download anyway", iconUrl: "images/download.png"}]
          }, function (notificationId) {
            if (itemsByExistingId[downloadItems[i].id].exists) {
              itemsByNotificationId[notificationId] = {foundItem: downloadItems[i], downloadItem: downloadItem, suggest: suggest};
              itemsByExistingId[downloadItems[i].id] = {notificationId: notificationId, suggest: suggest};
            } else {
              chrome.notifications.clear(notificationId);
              chrome.downloads.resume(downloadItem.id);
              suggest();
            }
          });
          break;
        }
      }
      if (!foundFile) {
        suggest();
      }
  });
  return true;
});

chrome.downloads.onChanged.addListener(function (downloadDelta) {
  if (itemsByExistingId[downloadDelta.id]) {
    if (downloadDelta.exists && downloadDelta.exists.previous === true && downloadDelta.exists.current === false) {
      itemsByExistingId[downloadDelta.id] = {exists: false};
    }
  }
});

chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
  if (itemsByNotificationId[notificationId]) {
    chrome.downloads.cancel(itemsByNotificationId[notificationId].downloadItem.id);
    chrome.downloads.erase({id: itemsByNotificationId[notificationId].downloadItem.id});
    delete itemsByExistingId[itemsByNotificationId[notificationId].foundItem.id];
    delete itemsByNotificationId[notificationId];
  }
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
  if (itemsByNotificationId[notificationId]) {
    if (buttonIndex === 0) {
      chrome.notifications.clear(notificationId);
      chrome.downloads.cancel(itemsByNotificationId[notificationId].downloadItem.id);
      chrome.downloads.erase({id: itemsByNotificationId[notificationId].downloadItem.id});
      chrome.downloads.open(itemsByNotificationId[notificationId].foundItem.id);
    } else if (buttonIndex === 1) {
      chrome.notifications.clear(notificationId);
      chrome.downloads.resume(itemsByNotificationId[notificationId].downloadItem.id);
      itemsByNotificationId[notificationId].suggest();
    }
    delete itemsByExistingId[itemsByNotificationId[notificationId].foundItem.id];
    delete itemsByNotificationId[notificationId];
  }
});

chrome.notifications.onClicked.addListener(function (notificationId) {
  if (itemsByNotificationId[notificationId]) {
    chrome.notifications.clear(notificationId);
    chrome.downloads.cancel(itemsByNotificationId[notificationId].downloadItem.id);
    chrome.downloads.erase({id: itemsByNotificationId[notificationId].downloadItem.id});
    chrome.downloads.show(itemsByNotificationId[notificationId].foundItem.id);
    delete itemsByExistingId[itemsByNotificationId[notificationId].foundItem.id];
    delete itemsByNotificationId[notificationId];
  }
});