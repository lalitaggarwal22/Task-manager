window.onload = () => {
   // Hold an instance of a db object for us to store the IndexedDB data in
  let db;

  const note = document.getElementById('notifications');
  const taskList = document.getElementById('task-list');
  const taskForm = document.getElementById('task-form');
  const title = document.getElementById('title');
  const hours = document.getElementById('deadline-hours');
  const minutes = document.getElementById('deadline-minutes');
  const day = document.getElementById('deadline-day');
  const month = document.getElementById('deadline-month');
  const year = document.getElementById('deadline-year');
  const notificationBtn = document.getElementById('enable');

  // Do an initial check to see what the notification permission state is
  if (Notification.permission === 'denied' || Notification.permission === 'default') {
    notificationBtn.style.display = 'block';
  } else {
    notificationBtn.style.display = 'none';
  }

 

  // Let us open our database
  const DBOpenRequest = window.indexedDB.open('toDoList', 4);

  

  DBOpenRequest.onsuccess = (event) => {
    note.appendChild(createListItem('Database initialised.'));

    // Store the result of opening the database in the db variable. This is used a lot below
    db = DBOpenRequest.result;

    // Run the displayData() function to populate the task list with all the to-do list data already in the IndexedDB
    displayData();
  };

  
  DBOpenRequest.onupgradeneeded = (event) => {
    db = event.target.result;

   
    // Create an objectStore for this database
    const objectStore = db.createObjectStore('toDoList', { keyPath: 'taskTitle' });

    // Define what data items the objectStore will contain
    objectStore.createIndex('hours', 'hours', { unique: false });
    objectStore.createIndex('minutes', 'minutes', { unique: false });
    objectStore.createIndex('day', 'day', { unique: false });
    objectStore.createIndex('month', 'month', { unique: false });
    objectStore.createIndex('year', 'year', { unique: false });

    objectStore.createIndex('notified', 'notified', { unique: false });

    note.appendChild(createListItem('Object store created.'));
  };

  function displayData() {
    // First clear the content of the task list so that you don't get a huge long list of duplicate stuff each time
    // the display is updated.
    while (taskList.firstChild) {
      taskList.removeChild(taskList.lastChild);
    }

    // Open our object store and then get a cursor list of all the different data items in the IDB to iterate through
    const objectStore = db.transaction('toDoList').objectStore('toDoList');
    objectStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      // Check if there are no (more) cursor items to iterate through
      if (!cursor) {
        // No more items to iterate through, we quit.
        note.appendChild(createListItem('Entries all displayed.'));
        return;
      }
      
      // Check which suffix the deadline day of the month needs
      const { hours, minutes, day, month, year, notified, taskTitle } = cursor.value;
      const ordDay = ordinal(day);

      // Build the to-do list entry and put it into the list item.
      const toDoText = `${taskTitle} — ${hours}:${minutes}, ${month} ${ordDay} ${year}.`;
      const listItem = createListItem(toDoText);

     

      // Put the item item inside the task list
      taskList.appendChild(listItem);

      // Create up and delete button
      const deleteButton = document.createElement('button');
      listItem.appendChild(deleteButton);
      deleteButton.textContent = 'Delete';

      const upButton = document.createElement('button');
      listItem.appendChild (upButton);
      upButton.textContent= 'up';

    

      // Set a data attribute on our delete button to associate the task it relates to.
      deleteButton.setAttribute('data-task', taskTitle);
       upButton.setAttribute('data-task', taskTitle);
      
      // Associate action (deletion) when clicked
      deleteButton.onclick = (event) => {
        deleteItem(event);
      };
      upButton.addEventListener('click', function() {
        // Get the current to-do list item
        var currentItem = this.parentNode;
      
        // Get the previous to-do list item
        var previousItem = currentItem.previousElementSibling;
      
        // Move the current item up by one position
        if (previousItem) {
          currentItem.parentNode.insertBefore(currentItem, previousItem);
        }
      });
     // continue on to the next item in the cursor
      cursor.continue();
    };
  };

  // Add listener for clicking the submit button
  taskForm.addEventListener('submit', addData, false);

  function addData(e) {
    // Prevent default, as we don't want the form to submit in the conventional way
    e.preventDefault();

    // This should never happen as there is the required attribute
    if (title.value === '' || hours.value === null || minutes.value === null || day.value === '' || month.value === '' || year.value === null) {
      note.appendChild(createListItem('Data not submitted — form incomplete.'));
      return;
    }
    
    // Grab the values entered into the form fields and store them in an object ready for being inserted into the IndexedDB
    const newItem = [
      { taskTitle: title.value, hours: hours.value, minutes: minutes.value, day: day.value, month: month.value, year: year.value, notified: 'no' },
    ];

    // Open a read/write DB transaction, ready for adding the data
    const transaction = db.transaction(['toDoList'], 'readwrite');

    // Report on the success of the transaction completing, when everything is done
    transaction.oncomplete = () => {
      note.appendChild(createListItem('Transaction completed: database modification finished.'));

      // Update the display of data to show the newly added item, by running displayData() again.
      displayData();
    };
    // Call an object store that's already been added to the database
    const objectStore = transaction.objectStore('toDoList');
    console.log(objectStore.indexNames);
    console.log(objectStore.keyPath);
    console.log(objectStore.name);
    console.log(objectStore.transaction);
    console.log(objectStore.autoIncrement);

    // Make a request to add our newItem object to the object store
    const objectStoreRequest = objectStore.add(newItem[0]);
    objectStoreRequest.onsuccess = (event) => {

      // Report the success of our request
      // (to detect whether it has been succesfully
      // added to the database, you'd look at transaction.oncomplete)
      note.appendChild(createListItem('Request successful.'));

      // Clear the form, ready for adding the next entry
      title.value = '';
      hours.value = null;
      minutes.value = null;
      day.value = null;
      month.value = null;
      year.value = null;
    };
  };
function deleteItem(event) {
    // Retrieve the name of the task we want to delete
    const dataTask = event.target.getAttribute('data-task');

    // Open a database transaction and delete the task, finding it by the name we retrieved above
    const transaction = db.transaction(['toDoList'], 'readwrite');
    transaction.objectStore('toDoList').delete(dataTask);

    // Report that the data item has been deleted
    transaction.oncomplete = () => {
      // Delete the parent of the button, which is the list item, so it is no longer displayed
      event.target.parentNode.parentNode.removeChild(event.target.parentNode);
      note.appendChild(createListItem(`Task "${dataTask}" deleted.`));
    };
  };

  // Check whether the deadline for each task is up or not, and responds appropriately
  function checkDeadlines() {
    // First of all check whether notifications are enabled or denied
    if (Notification.permission === 'denied' || Notification.permission === 'default') {
      notificationBtn.style.display = 'block';
    } else {
      notificationBtn.style.display = 'none';
    }
    // Grab the current time and date
    const now = new Date();

    // From the now variable, store the current minutes, hours, day of the month, month, year and seconds
    const minuteCheck = now.getMinutes();
    const hourCheck = now.getHours();
    const dayCheck = now.getDate(); // Do not use getDay() that returns the day of the week, 1 to 7
    const monthCheck = now.getMonth();
    const yearCheck = now.getFullYear(); // Do not use getYear() that is deprecated.

    // Open a new transaction
    const objectStore = db.transaction(['toDoList'], 'readwrite').objectStore('toDoList');
    
    // Open a cursor to iterate through all the data items in the IndexedDB
    objectStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) return;
      const { hours, minutes, day, month, year, notified, taskTitle } = cursor.value;

      // convert the month names we have installed in the IDB into a month number that JavaScript will understand.
      // The JavaScript date object creates month values as a number between 0 and 11.
      const monthNumber = MONTHS.indexOf(month);
      if (monthNumber === -1) throw new Error('Incorrect month entered in database.');

      // Check if the current hours, minutes, day, month and year values match the stored values for each task.
      // The parseInt() function transforms the value from a string to a number for comparison
      // (taking care of leading zeros, and removing spaces and underscores from the string).
      let matched = parseInt(hours) === hourCheck;
      matched &&= parseInt(minutes) === minuteCheck;
      matched &&= parseInt(day) === dayCheck;
      matched &&= parseInt(monthNumber) === monthCheck;
      matched &&= parseInt(year) === yearCheck;
      if (matched && notified === 'no') {
        // If the numbers all do match, run the createNotification() function to create a system notification
        // but only if the permission is set
        if (Notification.permission === 'granted') {
          createNotification(taskTitle);
        }
      }

      // Move on to the next cursor item
      cursor.continue();
    };
  };

  // Ask for permission when the 'Enable notifications' button is clicked
  function askNotificationPermission() {
    // Function to actually ask the permissions
    function handlePermission(permission) {
      // Whatever the user answers, we make sure Chrome stores the information
      if (!Reflect.has(Notification, 'permission')) {
        Notification.permission = permission;
      }

      // Set the button to shown or hidden, depending on what the user answers
      if (Notification.permission === 'denied' || Notification.permission === 'default') {
        notificationBtn.style.display = 'block';
      } else {
        notificationBtn.style.display = 'none';
      }
    };

    // Check if the browser supports notifications
    if (!Reflect.has(window, 'Notification')) {
      console.log('This browser does not support notifications.');
    } else {
      if (checkNotificationPromise()) {
        Notification.requestPermission().then(handlePermission);
      } else {
        Notification.requestPermission(handlePermission);
      }
    }
  };

  // Check whether browser supports the promise version of requestPermission()
  // Safari only supports the old callback-based version
  function checkNotificationPromise() {
    try {
      Notification.requestPermission().then();
    } catch(e) {
      return false;
    }

    return true;
  };

  // Wire up notification permission functionality to 'Enable notifications' button
  notificationBtn.addEventListener('click', askNotificationPermission);

  function createListItem(contents) {
    const listItem = document.createElement('li');
    listItem.textContent = contents;
    return listItem;
  };

  // Create a notification with the given title
  function createNotification(title) {
    // Create and show the notification
    const img = '/to-do-notifications/img/icon-128.png';
    const text = `HEY! Your task "${title}" is now overdue.`;
    const notification = new Notification('To do list', { body: text, icon: img });

    // We need to update the value of notified to 'yes' in this particular data object, so the
    // notification won't be set off on it again

    // First open up a transaction
    const objectStore = db.transaction(['toDoList'], 'readwrite').objectStore('toDoList');

    // Get the to-do list object that has this title as its title
    const objectStoreTitleRequest = objectStore.get(title);

    objectStoreTitleRequest.onsuccess = () => {
      // Grab the data object returned as the result
      const data = objectStoreTitleRequest.result;

      // Update the notified value in the object to 'yes'
      data.notified = 'yes';

      // Create another request that inserts the item back into the database
      const updateTitleRequest = objectStore.put(data);

      // When this new request succeeds, run the displayData() function again to update the display
      updateTitleRequest.onsuccess = () => {
        displayData();
      };
    };
  };

  // Using a setInterval to run the checkDeadlines() function every second
  setInterval(checkDeadlines, 1000);
}

// Helper function returning the day of the month followed by an ordinal (st, nd, or rd)
function ordinal(day) {
  const n = day.toString();
  const last = n.slice(-1);
  if (last === '1' && n !== '11') return `${n}st`;
  if (last === '2' && n !== '12') return `${n}nd`;
  if (last === '3' && n !== '13') return `${n}rd`;
  return `${n}th`;

};
function addTask() {
    const taskInput = document.getElementById("task-input");
    const taskList = document.getElementById("task-list");
    
    const task = document.createElement("li");
    task.innerHTML = `<a href="${taskInput.value}" target="_blank">${taskInput.value}</a>`;
    
    taskList.appendChild(task);
    taskInput.value = "";
  }
  const taskList = document.getElementById("task-list");
taskList.appendChild(task);
taskInput.value = "";
  
