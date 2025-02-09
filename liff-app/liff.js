// User service UUID: Change this to your generated service UUID
const USER_SERVICE_UUID         = 'f57be904-4ccb-48f5-b704-c00d0af8092d';
// User service characteristics
const CONFIG_CHARACTERISTIC_UUID = "DBFFA9A4-F94B-11E9-A13E-C7C134711C2C";
const SWITCH_CHARACTERISTIC_UUID = "0b88c737-3a34-49e1-b69d-00be3b723f4a";

// PSDI Service UUID: Fixed value for Developer Trial
const PSDI_SERVICE_UUID         = 'E625601E-9E55-4597-A598-76018A0D293D'; // Device ID
const PSDI_CHARACTERISTIC_UUID  = '26E2B12B-85F0-4F3F-9FDD-91D114270E6E';

// -------------- //
// On window load //
// -------------- //

window.onload = () => {
    initializeApp();
};

// ------------ //
// UI functions //
// ------------ //

function uiToggleDeviceConnected(connected) {
    const elStatus = document.getElementById("status");
    const elControls = document.getElementById("controls");

    elStatus.classList.remove("error");

    if (connected) {
        // Hide loading animation
        uiToggleLoadingAnimation(false);
        // Show status connected
        elStatus.classList.remove("inactive");
        elStatus.classList.add("success");
        elStatus.innerText = "Device connected";
        // Show controls
        elControls.classList.remove("hidden");
    } else {
        // Show loading animation
        uiToggleLoadingAnimation(true);
        // Show status disconnected
        elStatus.classList.remove("success");
        elStatus.classList.add("inactive");
        elStatus.innerText = "Device disconnected";
        // Hide controls
        //elControls.classList.add("hidden");
    }
}

function uiToggleLoadingAnimation(isLoading) {
    const elLoading = document.getElementById("loading-animation");

    if (isLoading) {
        // Show loading animation
        elLoading.classList.remove("hidden");
    } else {
        // Hide loading animation
        //elLoading.classList.add("hidden");
    }
}

function uiStatusError(message, showLoadingAnimation) {
    uiToggleLoadingAnimation(showLoadingAnimation);

    const elStatus = document.getElementById("status");
    const elControls = document.getElementById("controls");

    // Show status error
    elStatus.classList.remove("success");
    elStatus.classList.remove("inactive");
    elStatus.classList.add("error");
    elStatus.innerText = message;

    // Hide controls
    //elControls.classList.add("hidden");
}

function makeErrorMsg(errorObj) {
    return "Error\n" + errorObj.code + "\n" + errorObj.message;
}

//
// 「退勤/外出/直帰」ボタンをクリックしたときの処理
//

//function str2ab(str) {
//  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
//  var bufView = new Uint8Array(buf);
//  for (var i=0, strLen=str.length; i < strLen; i++) {
//    bufView[i] = str.charCodeAt(i);
//  }
//  return buf;
//}

function cb_submit(value){
    var str = value;
    alert(str);
    var buf = new ArrayBuffer(1);
    var bufView = new Uint8Array(buf);
    bufView[0] = value;
    window.switchCharacteristic.writeValue(buf).catch(error => {
        uiStatusError(makeErrorMsg(error),false);
    });
}

// -------------- //
// LIFF functions //
// (LIFF ver.2)   //
// -------------- //

function initializeApp() {
    liff.init({liffId:"1653372303-wkLaQJxY"},() => initializeLiff(), error => uiStatusError(makeErrorMsg(error), false));
}

function initializeLiff() {
    liff.initPlugins(['bluetooth']).then(() => {
        liffCheckAvailablityAndDo(() => liffRequestDevice());
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffCheckAvailablityAndDo(callbackIfAvailable) {
    // Check Bluetooth availability
    liff.bluetooth.getAvailability().then(isAvailable => {
        if (isAvailable) {
            uiToggleDeviceConnected(false);
            callbackIfAvailable();
        } else {
            uiStatusError("Bluetooth not available", true);
            setTimeout(() => liffCheckAvailablityAndDo(callbackIfAvailable), 10000);
        }
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });;
}

function liffRequestDevice() {
    liff.bluetooth.requestDevice().then(device => {
        liffConnectToDevice(device);
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffConnectToDevice(device) {
    device.gatt.connect().then(() => {
//        document.getElementById("device-name").innerText = device.name;
        document.getElementById("device-id").innerText = device.id;

        // Show status connected
        uiToggleDeviceConnected(true);

        // Get service
        device.gatt.getPrimaryService(USER_SERVICE_UUID).then(service => {
            liffGetUserService(service);
        }).catch(error => {
            uiStatusError(makeErrorMsg(error), false);
        });
        device.gatt.getPrimaryService(PSDI_SERVICE_UUID).then(service => {
            liffGetPSDIService(service);
        }).catch(error => {
            uiStatusError(makeErrorMsg(error), false);
        });

        // Device disconnect callback
        const disconnectCallback = () => {
            // Show status disconnected
            uiToggleDeviceConnected(false);

            // Remove disconnect callback
            device.removeEventListener('gattserverdisconnected', disconnectCallback);

            // Try to reconnect
            initializeLiff();
        };

        device.addEventListener('gattserverdisconnected', disconnectCallback);
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffGetUserService(service) {
    // get GATT characteristic of device's nick-name
    service.getCharacteristic(CONFIG_CHARACTERISTIC_UUID).then(characteristic => {
        window.configCharacteritic = characteristic;
        return characteristic.readValue();
    }).then(value => {
        const device_nick = new Uint8Array(value.buffer)
            .reduce((output,byte) => output + String.fromCharCode(byte),"");
        document.getElementById("device-name").innerText = device_nick; // display
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
    
    // get GATT characteristic of switch
    service.getCharacteristic(SWITCH_CHARACTERISTIC_UUID).then(characteristic => {
        window.switchCharacteristic = characteristic;
    }).catch(error => {
        alert("SWITCH");
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffGetPSDIService(service) {
    // Get PSDI value
    service.getCharacteristic(PSDI_CHARACTERISTIC_UUID).then(characteristic => {
        return characteristic.readValue();
    }).then(value => {
        // Byte array to hex string
        const psdi = new Uint8Array(value.buffer)
            .reduce((output, byte) => output + ("0" + byte.toString(16)).slice(-2), "");
        document.getElementById("device-psdi").innerText = psdi;
    }).catch(error => {
        alert("PSDI");
        uiStatusError(makeErrorMsg(error), false);
    });
}
