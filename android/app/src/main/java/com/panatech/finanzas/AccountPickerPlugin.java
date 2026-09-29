package com.panatech.finanzas;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AccountPicker")
public class AccountPickerPlugin extends Plugin {

    @com.getcapacitor.PluginMethod
    public void pickGoogleAccount(PluginCall call) {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent = AccountManager.newChooseAccountIntent(
                    null,
                    null,
                    new String[]{"com.google"},
                    null,
                    null,
                    null,
                    null
                );
            } else {
                intent = AccountManager.newChooseAccountIntent(
                    null,
                    null,
                    new String[]{"com.google"},
                    false,
                    null,
                    null,
                    null,
                    null
                );
            }
            startActivityForResult(call, intent, "chooseAccountResult");
        } catch (Exception e) {
            call.reject("Error al abrir selector de cuentas: " + e.getMessage());
        }
    }

    @com.getcapacitor.PluginMethod
    public void getDeviceGoogleAccounts(PluginCall call) {
        try {
            AccountManager manager = AccountManager.get(getContext());
            Account[] accounts = manager.getAccountsByType("com.google");
            JSArray arr = new JSArray();
            if (accounts != null) {
                for (Account account : accounts) {
                    if (account.name != null && !account.name.trim().isEmpty()) {
                        JSObject obj = new JSObject();
                        obj.put("email", account.name.trim());
                        String displayName = account.name.contains("@") ? account.name.split("@")[0] : account.name;
                        obj.put("name", displayName);
                        arr.put(obj);
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("accounts", arr);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("accounts", new JSArray());
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @ActivityCallback
    private void chooseAccountResult(PluginCall call, ActivityResult result) {
        if (result == null) {
            call.reject("Sin respuesta del sistema");
            return;
        }

        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Intent data = result.getData();
            String accountName = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);

            if (accountName != null && !accountName.trim().isEmpty()) {
                JSObject ret = new JSObject();
                ret.put("email", accountName.trim());
                String userName = accountName.contains("@") ? accountName.split("@")[0] : accountName;
                ret.put("name", userName);
                call.resolve(ret);
            } else {
                call.reject("No se seleccionó ninguna cuenta válida");
            }
        } else {
            call.reject("Selección de cuenta cancelada");
        }
    }
}
