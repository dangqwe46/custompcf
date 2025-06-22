var defectSdk = window.defectSdk || {};

(function () {
  var FORM_TYPE = {
    Undefined: 0,
    Create: 1,
    Update: 2,
    ReadOnly: 3,
    Disabled: 4,
    BulkEdit: 5,
  };
  var staticRegNumber = "9V-";
  var alwaysUpperCase = function (formContext,aircraftRegNumber) {
    formContext.getAttribute("o365m_aircraftregistrationnumber").setValue(aircraftRegNumber.toUpperCase());
    return aircraftRegNumber.toUpperCase()
  };
  //#region private function
  var alwaysSet9V = function (formContext, aircraftRegNumber) {
    if (
      !aircraftRegNumber.includes(staticRegNumber) &&
      (!aircraftRegNumber.startsWith("9V-S") ||
        !aircraftRegNumber.startsWith("9V-M"))
    ) {
      formContext
        .getAttribute("o365m_aircraftregistrationnumber")
        .setValue(staticRegNumber);
    } else {
      // Check if last two characters are letters
      var lastTwoChars = aircraftRegNumber.slice(-2);
      var isLastTwoLetters = /^[A-Za-z]{2}$/.test(lastTwoChars);

      if (isLastTwoLetters) {
        formContext
          .getAttribute("o365m_aircraftregistrationnumber")
          .setValue(aircraftRegNumber);
      } else {
        formContext
          .getAttribute("o365m_aircraftregistrationnumber")
          .setValue(staticRegNumber);
      }
    }
  };
  var validateRegNumber = function (formContext, aircraftRegNumber) {
    var lastTwoChars = aircraftRegNumber.slice(-2);
    var isLastTwoLetters = /^[A-Za-z]{2}$/.test(lastTwoChars);

    if (
      aircraftRegNumber.length !== 6 ||
      aircraftRegNumber === staticRegNumber ||
      !(
        aircraftRegNumber.startsWith("9V-S") ||
        aircraftRegNumber.startsWith("9V-M")
      ) ||
      !isLastTwoLetters
    ) {
      formContext
        .getControl("o365m_aircraftregistrationnumber")
        .setNotification(
          "The aircraft registration number must start with 9V-S or 9V-M and be followed by 2 alphabets.",
          "regNumber"
        );
    } else {
      formContext
        .getControl("o365m_aircraftregistrationnumber")
        .clearNotification("regNumber");
    }
  };
  var showPopupWhenSaveDefect = function (formContext) {
    var alertStrings = {
      confirmButtonLabel: "Proceed",
      text: `For urgent issues such as: 
            Choked toilet, cannot recline seat, broken/unstable tray table, safety issues like faulty safety belt, sharp edges, etc. 
            Please report immediately to Cabin Crew directly.`,
      title: "",
    };
    var alertOptions = { height: 250, width: 400 };
    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
      function (success) {
        console.log("Alert dialog closed");
      },
      function (error) {
        console.log(error.message);
      }
    );
  };
  var updateRegardingOfAnnotation = function (formContext) {
    var recordId = formContext.data.entity.getId().replace(/[{}]/g, "");
    var defectImageTempId = formContext
      .getAttribute("o365m_defecttempid")
      .getValue();
    var defectVideoTempId = formContext
      .getAttribute("o365m_uploadpcf")
      .getValue();
    var webAPI;
    var clientContext = Xrm.Utility.getGlobalContext().client;
    if (clientContext.getClientState() === "Offline") {
      webAPI = Xrm.WebApi.offline;
    } else {
      webAPI = Xrm.WebApi.online;
    }
    const query = `?fetchXml=
    <fetch>
    <entity name="annotation">
      <attribute name="annotationid" />
      <attribute name="notetext" />
      <attribute name="objectid" />
      <filter type="or">
        <condition attribute="notetext" operator="like" value="%DefectId: ${defectImageTempId}%" />
        <condition attribute="notetext" operator="like" value="%DefectId: ${defectVideoTempId}%" />
      </filter>
    </entity>
  </fetch>`;
    webAPI.retrieveMultipleRecords("annotation", query).then(
      function success(results) {
        for (var i = 0; i < results.entities.length; i++) {
          var result = results.entities[i];
          if (!result.hasOwnProperty("_objectid_value")) {
            var annotationid = result["annotationid"]; // Guid
            var record = {};
            record.objecttypecode = "o365m_defects"; // EntityName
            record[
              "objectid_o365m_defects@odata.bind"
            ] = `/o365m_defectses(${recordId})`; // Lookup

            Xrm.WebApi.updateRecord("annotation", annotationid, record).then(
              function success(result) {
                console.log("Updated annotation");
              },
              function (error) {
                console.log(error.message);
              }
            );
          }
        }
      },
      function (error) {
        console.log(error.message);
      }
    );
  };
  var onPostSaveFunction = function (executionContext) {
    var formContext = executionContext.getFormContext();
    formContext.ui.setFormNotification(
      "Saved Defect successfully.",
      "INFO",
      "saveRecord"
    );
    updateRegardingOfAnnotation(formContext);
    setTimeout(function () {
      formContext.ui.clearFormNotification("saveRecord");
    }, 3000);
  };

  //#region

  //#region public function
  this.Onload = function (executionContext) {
    var formContext = executionContext.getFormContext();
    var formType = formContext.ui.getFormType();
    //always set 9V- on the aircraft reg number
    // check 9V- is already in the reg number
    var aircraftRegNumber = formContext
      .getAttribute("o365m_aircraftregistrationnumber")
      .getValue()
      ? formContext.getAttribute("o365m_aircraftregistrationnumber").getValue()
      : "";
    alwaysSet9V(formContext, aircraftRegNumber);
    if (formType === FORM_TYPE.Create) {
      showPopupWhenSaveDefect(formContext);
    }
    formContext.data.entity.addOnPostSave(onPostSaveFunction);
  };
  this.OnchangeRegNumber = function (executionContext) {
    var formContext = executionContext.getFormContext();
    var aircraftRegNumber = formContext
      .getAttribute("o365m_aircraftregistrationnumber")
      .getValue()
      ? formContext.getAttribute("o365m_aircraftregistrationnumber").getValue()
      : "";
    var aircraftRegNumberUpperCase = alwaysUpperCase(formContext, aircraftRegNumber);
    alwaysSet9V(formContext, aircraftRegNumberUpperCase);
    validateRegNumber(formContext, aircraftRegNumberUpperCase);
  };
  this.Onsave = function (executionContext) {
    var formContext = executionContext.getFormContext();
    var aircraftRegNumber = formContext
      .getAttribute("o365m_aircraftregistrationnumber")
      .getValue()
      ? formContext.getAttribute("o365m_aircraftregistrationnumber").getValue()
      : "";
    validateRegNumber(formContext, aircraftRegNumber);
  };
  this.OnchangeDepartDate = function (executionContext) {
    var formContext = executionContext.getFormContext();
    var departDate = formContext.getAttribute("o365m_departuredate").getValue();
    if (departDate) {
      var departDate = new Date(departDate);
      departDate.setHours(0, 0, 0, 0); // Set time to 00:00:00
      var today = new Date();
      today.setHours(0, 0, 0, 0); // Set time to 00:00:00
      if (departDate > today) {
        formContext
          .getControl("o365m_departuredate")
          .setNotification("Departure date cannot be in the future.", "ERROR");
      } else {
        formContext.getControl("o365m_departuredate").clearNotification();
      }
    }
  };
  //#endregion
}).call(defectSdk);
