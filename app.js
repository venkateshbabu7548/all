const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const hasPriorityAndStatusProperties = (queryObject) => {
  return queryObject.priority !== undefined && queryObject.status !== undefined;
};
const hasCategoryAndStatusProperties = (queryObject) => {
  return queryObject.category !== undefined && queryObject.status !== undefined;
};
const hasCategoryAndPriorityProperties = (queryObject) => {
  return (
    queryObject.category !== undefined && queryObject.priority !== undefined
  );
};

const hasPriorityProperty = (queryObject) => {
  return queryObject.priority !== undefined;
};
const hasStatusProperty = (queryObject) => {
  return queryObject.status !== undefined;
};
const hasCategoryProperty = (queryObject) => {
  return queryObject.category !== undefined;
};

// API 1
app.get("/todos/", async (request, response) => {
  let data = null;
  let doDosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      toDoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE status ="${status}" AND priority = "${priority}" AND todo LIKE "%${search_q}%";`;
      data = await db.all(toDoQuery);
      response.send(data);
      break;
    case hasCategoryAndStatusProperties(request.query):
      toDoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE status ="${status}" AND category = "${category}" AND todo LIKE "%${search_q}%";`;
      data = await db.all(toDoQuery);
      response.send(data);
      break;
    case hasCategoryAndPriorityProperties(request.query):
      toDoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE priority ="${priority}" AND category = "${category}" AND todo LIKE "%${search_q}%";`;
      data = await db.all(toDoQuery);
      response.send(data);
      break;
    case hasPriorityProperty(request.query):
      toDoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE todo LIKE "%${search_q}%" AND priority = "${priority}";`;
      data = await db.all(toDoQuery);
      if (data.length === 0) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        response.send(data);
      }
      break;
    case hasStatusProperty(request.query):
      toDoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE todo LIKE "%${search_q}%" AND status = "${status}";`;
      data = await db.all(toDoQuery);

      if (data.length === 0) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else {
        response.send(data);
      }
      break;
    case hasCategoryProperty(request.query):
      toDoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE todo LIKE "%${search_q}%" AND category = "${category}";`;
      data = await db.all(toDoQuery);
      if (data.length === 0) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        response.send(data);
      }
      break;
    default:
      toDoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE todo LIKE "%${search_q}%";`;
      data = await db.all(toDoQuery);
      response.send(data);
  }
});

// API 2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

// API 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const getDateQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE due_date = "${date}";`;
  const dates = await db.all(getDateQuery);
  if (dates.length === 0) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    response.send(dates);
  }
});

const validateDate = (dueDate) => {
  dueDateSplit = dueDate.split("-");
  if (dueDateSplit.length === 3) {
    const formattedDate = format(
      new Date(
        parseInt(dueDateSplit[0]),
        parseInt(dueDateSplit[1]),
        parseInt(dueDateSplit[2])
      ),
      "yyyy-MM-dd"
    );
    return formattedDate;
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
};
const validateStatus = (status) => {
  if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
    return true;
  }
  return false;
};
const validatePriority = (each) => {
  if (each === "HIGH" || each === "MEDIUM" || each === "LOW") {
    return true;
  }
  return false;
};
const validateCategory = (each) => {
  if (each === "WORK" || each === "HOME" || each === "LEARNING") {
    return true;
  }
  return false;
};

// API 4
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  let newDate = validateDate(dueDate);
  newDate = newDate.split("-");
  let year = parseInt(newDate[0]);
  let month = parseInt(newDate[1]);
  let date = parseInt(newDate[2]);
  const modified = new Date(year, month, date);
  if (validateStatus(status)) {
    if (validatePriority(priority)) {
      if (validateCategory(category)) {
        if (isValid(new Date(year, month, date))) {
          const addTodoQuery = `INSERT INTO todo(id,todo,priority,status,category,due_date)
            VALUES(${id},"${todo}","${priority}","${status}","${category}","${modified}");`;
          await db.run(addTodoQuery);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
});

// API 5
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  let data = null;
  let query = "";
  if (
    status !== undefined &&
    priority === undefined &&
    todo === undefined &&
    category === undefined &&
    dueDate === undefined
  ) {
    if (validateStatus(status)) {
      query = `UPDATE todo SET status = "${status}" WHERE id = ${todoId};`;
      data = await db.run(query);
      response.send("Status Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (
    status === undefined &&
    priority !== undefined &&
    todo === undefined &&
    category === undefined &&
    dueDate === undefined
  ) {
    if (validatePriority(priority)) {
      query = `UPDATE todo SET priority = "${priority}" WHERE id = ${todoId};`;
      data = await db.run(query);
      response.send("Priority Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (
    status === undefined &&
    priority === undefined &&
    todo !== undefined &&
    category === undefined &&
    dueDate === undefined
  ) {
    query = `UPDATE todo SET todo = "${todo}" WHERE id = ${todoId};`;
    data = await db.run(query);
    response.send("Todo Updated");
  } else if (
    status === undefined &&
    priority === undefined &&
    todo === undefined &&
    category !== undefined &&
    dueDate === undefined
  ) {
    if (validateCategory(category)) {
      query = `UPDATE todo SET category = "${category}" WHERE id = ${todoId};`;
      data = await db.run(query);
      response.send("Category Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else {
    let newDate = validateDate(dueDate);
    newDate = newDate.split("-");
    let year = parseInt(newDate[0]);
    let month = parseInt(newDate[1]);
    let date = parseInt(newDate[2]);
    const modified = new Date(year, month, date);
    if (isValid(new Date(year, month, date))) {
      query = `UPDATE todo SET due_date = "${newDate}" WHERE id = ${todoId};`;
      data = await db.run(query);
      response.send("Due Date Updated");
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

// API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
