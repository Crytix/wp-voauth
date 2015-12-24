// after the document has loaded, we hook up our events and initialize any other js functionality:
jQuery(document).ready(function() {
	voa.init();
});

// namespace the voa functions to prevent global conflicts, using the 'immediately invoked function expression' pattern:
;(function ( voa, undefined ) {

    // <private properties>
	
	var wp_media_dialog_field; // field to populate after the admin selects an image using the wordpress media dialog
	var timeout_interval;
	var timeout_idle_time = 0;
	var timeout_warning_reached = false;
	
    // <public methods and properties>
	
	// init the client-side voa functionality:
	voa.init = function() {
		
		// store the client's GMT offset (timezone) for converting server time into local time on a per-client basis (this makes the time at which a provider was linked more accurate to the specific user):
		d = new Date; 
		gmtoffset = d.getTimezoneOffset() / 60;
		document.cookie = 'gmtoffset=' + gmtoffset;
		
		// START of Settings Page functionality
		
		// handle accordion sections:
		jQuery(".voa-settings h3").click(function(e) {
			jQuery(this).parent().find(".form-padding").slideToggle();
		});
		
		// handle help tip buttons:
		jQuery(".tip-button").click(function(e) {
			e.preventDefault();
			jQuery(this).parents(".has-tip").find(".tip-message").fadeToggle();
		});
		
		// automatically show warning tips when the user enters a sensitive form field:
		jQuery(".voa-settings input, .voa-settings select").focus(function(e) {
			e.preventDefault();
			var tip_warning = jQuery(this).parents(".has-tip").find(".tip-warning, .tip-info");
			//var tip_info = jQuery(this).parents("tr").find(".tip-info");
			if (tip_warning.length > 0) {
				tip_warning.fadeIn();
				jQuery(this).parents(".has-tip").find(".tip-message").fadeIn();
			}
		});
		
		// handle global togglers:
		jQuery("#voa-settings-sections-on").click(function(e) {
			e.preventDefault();
			jQuery(".voa-settings h3").parent().find(".form-padding").slideDown();
		});
		jQuery("#voa-settings-sections-off").click(function(e) {
			e.preventDefault();
			jQuery(".voa-settings h3").parent().find(".form-padding").slideUp();
		});
		jQuery("#voa-settings-tips-on").click(function(e) {
			e.preventDefault();
			jQuery(".tip-message").fadeIn();
		});
		jQuery("#voa-settings-tips-off").click(function(e) {
			e.preventDefault();
			jQuery(".tip-message").fadeOut();
		});
		
		// START of login form designer features
		
		// handle login form design select box:
		/*
		jQuery("[name=voa_login_form_design]").change(function() {
			var design_name = jQuery("#voa-login-form-design :selected").text();
			var designs = jQuery("[name=voa_login_form_designs]").val();
			var designs = JSON.parse(designs);
			var design = designs[design_name];
			if (design) {
				jQuery("[name=voa_login_form_design_name]").val(design_name);
				jQuery("[name=voa_login_form_icon_set]").val(design.icon_set);
				jQuery("[name=voa_login_form_button_prefix]").val(design.button_prefix);
				jQuery("[name=voa_login_form_logged_out_title]").val(design.logged_out_title);
				jQuery("[name=voa_login_form_logged_in_title]").val(design.logged_in_title);
				jQuery("[name=voa_login_form_logging_in_title]").val(design.logging_in_title);
				jQuery("[name=voa_login_form_logging_out_title]").val(design.logging_out_title);
			}
		});
		jQuery("[name=voa_login_form_design]").change(); // fire this once to populate the sub-form
		*/
		
		// new design button:
		jQuery("#voa-login-form-new").click(function(e) {
			// show the edit design sub-section and hide the design selector:
			jQuery("#voa-login-form-design").parents("tr").hide();
			jQuery("#voa-login-form-design-form").addClass('new-design');
			jQuery("#voa-login-form-design-form input").not(":button").val(''); // clears the form field values
			jQuery("#voa-login-form-design-form h4").text('New Design');
			jQuery("#voa-login-form-design-form").show();
		});
		
		// edit design button:
		jQuery("#voa-login-form-edit").click(function(e) {
			var design_name = jQuery("#voa-login-form-design :selected").text();
			var designs = jQuery("[name=voa_login_form_designs]").val();
			var designs = JSON.parse(designs);
			var design = designs[design_name];
			if (design) {
				// pull the design into the form fields for editing
				// TODO: don't hard code these, we want to add new fields in the future without having to update this function...
				jQuery("[name=voa_login_form_design_name]").val(design_name);
				jQuery("[name=voa_login_form_icon_set]").val(design.icon_set);
				jQuery("[name=voa_login_form_show_login]").val(design.show_login);
				jQuery("[name=voa_login_form_show_logout]").val(design.show_logout);
				jQuery("[name=voa_login_form_layout]").val(design.layout);
				jQuery("[name=voa_login_form_button_prefix]").val(design.button_prefix);
				jQuery("[name=voa_login_form_logged_out_title]").val(design.logged_out_title);
				jQuery("[name=voa_login_form_logged_in_title]").val(design.logged_in_title);
				jQuery("[name=voa_login_form_logging_in_title]").val(design.logging_in_title);
				jQuery("[name=voa_login_form_logging_out_title]").val(design.logging_out_title);
				// show the edit design sub-section and hide the design selector:
				jQuery("#voa-login-form-design").parents("tr").hide();
				jQuery("#voa-login-form-design-form").removeClass('new-design');
				jQuery("#voa-login-form-design-form h4").text('Edit Design');
				jQuery("#voa-login-form-design-form").show();
			}
		});
		
		// delete design button:
		jQuery("#voa-login-form-delete").click(function(e) {
			// get the designs:
			var designs = jQuery("[name=voa_login_form_designs]").val();
			var designs = JSON.parse(designs);
			// get the old design name (the design we'll be deleting)
			var old_design_name = jQuery("#voa-login-form-design :selected").text();
			jQuery("#voa-login-form-design option:contains('" + old_design_name + "')").remove();
			delete designs[old_design_name];
			// update the designs array for POST:
			jQuery("[name=voa_login_form_designs]").val(JSON.stringify(designs));
		});
		
		// edit design ok button:
		jQuery("#voa-login-form-ok").click(function(e) {
			// applies changes to the current design by updating the designs array stored as JSON in a hidden form field...
			// get the design name being proposed
			var new_design_name = jQuery("[name=voa_login_form_design_name]").val();
			// remove any validation error from a previous failed attempt:
			jQuery("#voa-login-form-design-form .validation-warning").remove();
			// make sure the design name is not empty:
			if (!jQuery("#voa-login-form-design-name").val()) {
				var validation_warning = "<p id='validation-warning' class='validation-warning'>Design name cannot be empty.</span>";
				jQuery("#voa-login-form-design-name").parent().append(validation_warning);
				return;
			}
			// this is either a NEW design or MODIFIED design, handle accordingly:
			if (jQuery("#voa-login-form-design-form").hasClass('new-design')) {
				// NEW DESIGN, add it...
				// make sure the design name doesn't already exist:
				if (jQuery("#voa-login-form-design option").text().indexOf(new_design_name) != -1) {
					// design name already exists, notify the user and abort:
					var validation_warning = "<p id='validation-warning' class='validation-warning'>Design name already exists! Please choose a different name.</span>";
					jQuery("#voa-login-form-design-name").parent().append(validation_warning);
					return;
				}
				else {
					// get the designs array which contains all of our designs:
					var designs = jQuery("[name=voa_login_form_designs]").val();
					var designs = JSON.parse(designs);
					// add a design to the designs array:
					// TODO: don't hard code these, we want to add new fields in the future without having to update this function...
					designs[new_design_name] = {};
					designs[new_design_name].icon_set = jQuery("[name=voa_login_form_icon_set]").val();
					designs[new_design_name].show_login = jQuery("[name=voa_login_form_show_login]").val();
					designs[new_design_name].show_logout = jQuery("[name=voa_login_form_show_logout]").val();
					designs[new_design_name].layout = jQuery("[name=voa_login_form_layout]").val();
					designs[new_design_name].button_prefix = jQuery("[name=voa_login_form_button_prefix]").val();
					designs[new_design_name].logged_out_title = jQuery("[name=voa_login_form_logged_out_title]").val();
					designs[new_design_name].logged_in_title = jQuery("[name=voa_login_form_logged_in_title]").val();
					designs[new_design_name].logging_in_title = jQuery("[name=voa_login_form_logging_in_title]").val();
					designs[new_design_name].logging_out_title = jQuery("[name=voa_login_form_logging_out_title]").val();
					// update the select box to include this new design:
					jQuery("#voa-login-form-design").append(jQuery("<option></option>").text(new_design_name).attr("selected", "selected"));
					// select the design in the selector:
					//jQuery("#voa-login-form-design :selected").text(new_design_name);
					// update the designs array for POST:
					jQuery("[name=voa_login_form_designs]").val(JSON.stringify(designs));
					// hide the design editor and show the select box:
					jQuery("#voa-login-form-design").parents("tr").show();
					jQuery("#voa-login-form-design-form").hide();
				}
			}
			else {
				// MODIFIED DESIGN, add it and remove the old one...
				// get the designs array which contains all of our designs:
				var designs = jQuery("[name=voa_login_form_designs]").val();
				var designs = JSON.parse(designs);
				// remove the old design:
				var old_design_name = jQuery("#voa-login-form-design :selected").text();
				jQuery("#voa-login-form-design option:contains('" + old_design_name + "')").remove();
				delete designs[old_design_name];
				// add the modified design:
				// TODO: don't hard code these, we want to add new fields in the future without having to update this function...
				designs[new_design_name] = {};
				designs[new_design_name].icon_set = jQuery("[name=voa_login_form_icon_set]").val();
				designs[new_design_name].show_login = jQuery("[name=voa_login_form_show_login]").val();
				designs[new_design_name].show_logout = jQuery("[name=voa_login_form_show_logout]").val();
				designs[new_design_name].layout = jQuery("[name=voa_login_form_layout]").val();
				designs[new_design_name].button_prefix = jQuery("[name=voa_login_form_button_prefix]").val();
				designs[new_design_name].logged_out_title = jQuery("[name=voa_login_form_logged_out_title]").val();
				designs[new_design_name].logged_in_title = jQuery("[name=voa_login_form_logged_in_title]").val();
				designs[new_design_name].logging_in_title = jQuery("[name=voa_login_form_logging_in_title]").val();
				designs[new_design_name].logging_out_title = jQuery("[name=voa_login_form_logging_out_title]").val();
				// update the select box to include this new design:
				jQuery("#voa-login-form-design").append(jQuery("<option></option>").text(new_design_name).attr("selected", "selected"));
				// select the design in the selector:
				//jQuery("#voa-login-form-design :selected").text(new_design_name);
				//jQuery("#voa-login-form-design option:contains('" + new_design_name + "')").attr("selected", "selected");
				// update the designs array for POST:
				jQuery("[name=voa_login_form_designs]").val(JSON.stringify(designs));
				// hide the design editor and show the design selector:
				jQuery("#voa-login-form-design").parents("tr").show();
				jQuery("#voa-login-form-design-form").hide();
			}
		});
		
		// cancels the changes to the current design
		jQuery("#voa-login-form-cancel").click(function(e) {
			jQuery("#voa-login-form-design").parents("tr").show();
			jQuery("#voa-login-form-design-form").hide();
		});
		
		// END of login form designer features

		// login redirect sub-settings:
		jQuery("[name=voa_login_redirect]").change(function() {
			jQuery("[name=voa_login_redirect_url]").hide();
			jQuery("[name=voa_login_redirect_page]").hide();
			var val = jQuery(this).val();
			if (val == "specific_page") {
				jQuery("[name=voa_login_redirect_page]").show();
			}
			else if (val == "custom_url") {
				jQuery("[name=voa_login_redirect_url]").show();
			}
		});
		
		// logout redirect sub-settings:
		jQuery("[name=voa_login_redirect]").change();
		jQuery("[name=voa_logout_redirect]").change(function() {
			jQuery("[name=voa_logout_redirect_url]").hide();
			jQuery("[name=voa_logout_redirect_page]").hide();
			var val = jQuery(this).val();
			if (val == "specific_page") {
				jQuery("[name=voa_logout_redirect_page]").show();
			}
			else if (val == "custom_url") {
				jQuery("[name=voa_logout_redirect_url]").show();
			}
		});
		jQuery("[name=voa_logout_redirect]").change();
		
		// show the wordpress media dialog for selecting a logo image:
		jQuery('#voa_logo_image_button').click(function(e) {
			e.preventDefault();
			wp_media_dialog_field = jQuery('#voa_logo_image');
			voa.selectMedia();
		});
		
		// show the wordpress media dialog for selecting a bg image:
		jQuery('#voa_bg_image_button').click(function(e) {
			e.preventDefault();
			wp_media_dialog_field = jQuery('#voa_bg_image');
			voa.selectMedia();
		});
		
		jQuery("#voa-paypal-button").hover(
		function() {
			jQuery("#voa-heart").css("opacity", "1");
		},
		function() {
			jQuery("#voa-heart").css("opacity", "0");
		});
		
		// END of Settings Page functionality
		
		// START of Profile Page functionality
		
		// attach unlink button click events:
		jQuery(".voa-unlink-account").click(function(event) {
			event.preventDefault();
			var btn = jQuery(this);
			var voa_identity_row = btn.data("voa-identity-row");
			//jQuery(this).replaceWith("<span>Please wait...</span>");
			btn.hide();
			btn.after("<span> Please wait...</span>");
			var post_data = {
				action: "voa_unlink_account",
				voa_identity_row: voa_identity_row,
			}
			jQuery.ajax({
				type: "POST",
				url: voa_jvars.ajaxurl,
				data: post_data,
				success: function(json_response) {
					var oresponse = JSON.parse(json_response);
					if (oresponse["result"] == 1) {
						btn.parent().fadeOut(1000, function() {
							btn.parent().remove();
						});
					}
				}
			});
		});
		
		// END Profile Page functionality
		
		// START Login Form functionality
		
		// handle login button click:
		jQuery(".voa-login-button").click(function(event) {
			event.preventDefault();
			window.location = jQuery(this).attr("href");
			// fade out the WordPress login form:
			jQuery("#login #loginform").fadeOut();	// the WordPress username/password form.
			jQuery("#login #nav").fadeOut(); // the WordPress "Forgot my password" link.
			jQuery("#login #backtoblog").fadeOut(); // the WordPress "<- Back to blog" link.
			jQuery(".message").fadeOut(); // the WordPress messages (e.g. "You are now logged out.").
			// toggle the loading style:
			jQuery(".voa-login-form .voa-login-button").not(this).addClass("loading-other");
			jQuery(".voa-login-form .voa-logout-button").addClass("loading-other");
			jQuery(this).addClass("loading");
			var logging_in_title = jQuery(this).parents(".voa-login-form").data("logging-in-title");
			jQuery(".voa-login-form #voa-title").text(logging_in_title);
			//return false;
		});
		
		//handle logout button click:
		jQuery(".voa-logout-button").click(function(event) {
			// fade out the login form:
			jQuery("#login #loginform").fadeOut();
			jQuery("#login #nav").fadeOut();
			jQuery("#login #backtoblog").fadeOut();
			// toggle the loading style:
			jQuery(this).addClass("loading");
			jQuery(".voa-login-form .voa-logout-button").not(this).addClass("loading-other");
			jQuery(".voa-login-form .voa-login-button").addClass("loading-other");
			var logging_out_title = jQuery(this).parents(".voa-login-form").data("logging-out-title");
			jQuery(".voa-login-form #voa-title").text(logging_out_title);
			//return false;
		});
		
		// show or log the client's login result which includes success or error messages:
		var msg = jQuery("#voa-result").html();
		//var msg = voa_jvars.login_message; // TODO: this method doesn't work that well since we don't clear the session variable at the server...
		if (msg) {
			if (voa_jvars.show_login_messages) {
				// notify the client of the login result with a visible, short-lived message at the top of the screen:
				voa.notify(msg);
			}
			else {
				// log the message to the dev console; useful for client support, troubleshooting and debugging if the admin has turned off the visible messages:
				console.log(msg);
			}
		}
		
		// create the login session timeout if the admin enabled this setting:
		if (voa_jvars.logged_in === '1' && voa_jvars.logout_inactive_users !== '0') {
			// bind mousemove, keypress events to reset the timeout:
			jQuery(document).mousemove(function(e) {
				timeout_idle_time = 0;
			});
			jQuery(document).keypress(function(e) {
				timeout_idle_time = 0;
			});
			// start a timer to keep track of each minute that passes:
			timeout_interval = setInterval(voa.timeoutIncrement, 60000);
		}
		
		// END of Login Form functionality
		
		// START of Login Screen customizations
		
		// hide the login form if the admin enabled this setting:
		// TODO: consider .remove() as well...maybe too intrusive though...and remember that bots don't use javascript so this won't remove it for bots and those bots can still spam the login form...
		if (voa_jvars.hide_login_form == 1) {
			jQuery("#login #loginform").hide();
			jQuery("#login #nav").hide();
			jQuery("#login #backtoblog").hide();
		}
		
		// show custom logo and bg if the admin enabled this setting:
		if (document.URL.indexOf("wp-login") >= 0) {
			if (voa_jvars.logo_image) {
				jQuery(".login h1 a").css("background-image", "url(" + voa_jvars.logo_image + ")");
			}
			if (voa_jvars.bg_image) {
				jQuery("body").css("background-image", "url(" + voa_jvars.bg_image + ")");
				jQuery("body").css("background-size", "cover");
			}
		}
		
		// END of Login Screen customizations
		
	} // END of voa.init()
	
	// handle idle timeout:
	voa.timeoutIncrement = function() {
		var duration = voa_jvars.logout_inactive_users;
		if (timeout_idle_time == duration - 1) {
			// warning reached, next time we logout:
			timeout_idle_time += 1;
			voa.notify('Your session will expire in 1 minute due to inactivity.');
		}
		else if (timeout_idle_time == duration) {
			// idle duration reached, logout the user:
			voa.notify('Logging out due to inactivity...');
			voa.processLogout();
		}
		/*
		else {
			// increment the idle time:
			timeout_idle_time += 1;
			console.log('Timeout incremented to ' + timeout_idle_time);
		}
		*/
	}
	
	// shows the associated tip message for a setting:
	voa.showTip = function(id) {
		jQuery(id).parents("tr").find(".tip-message").fadeIn();
	}
	
	// shows the default wordpress media dialog for selecting or uploading an image:
	voa.selectMedia = function() {
		var custom_uploader;
		if (custom_uploader) {
			custom_uploader.open();
			return;
		}
		custom_uploader = wp.media.frames.file_frame = wp.media({
			title: 'Choose Image',
			button: {
				text: 'Choose Image'
			},
			multiple: false
		});
		custom_uploader.on('select', function() {
			attachment = custom_uploader.state().get('selection').first().toJSON();
			wp_media_dialog_field.val(attachment.url);
		});
		custom_uploader.open();
	}

	// displays a short-lived notification message at the top of the screen:
	voa.notify = function(msg) {
		jQuery(".voa-login-message").remove();
		var h = "";
		h += "<div class='voa-login-message'><span>" + msg + "</span></div>";
		jQuery("body").prepend(h);
		jQuery(".voa-login-message").fadeOut(5000);
	}
	
	// this was going to be introduced for the login form design editor, but it was determined that having multiple lightboxes (e.g. edit design -> lightbox -> choose media -> another lightbox) is counter-productive to UX, but this could be used later for other things...
	voa.dialog = function(msg) {
		/*
		// create a lightbox
		jQuery("body").prepend("<div id='voa-lightbox' class='voa-settings voa-settings-section'></div>");
		jQuery("#voa-lightbox").click(function(e) {
			jQuery("#voa-lightbox").fadeOut();
			jQuery("body").removeClass("voa-lightbox-visible");
		});
		// embed designer form into the lightbox
		jQuery("#voa-login-form-design-form").appendTo("#voa-lightbox");
		jQuery("#voa-login-form-design-form").show();
		// show the lightbox
		jQuery("#voa-lightbox").fadeIn();
		jQuery("body").addClass("voa-lightbox-visible");
		*/
	}
	
	// logout:
	voa.processLogout = function(callback) {
		var data = {
			'action': 'voa_logout',
		};
		jQuery.ajax({
			url: voa_jvars.ajaxurl,
			data: data,
			success: function(json) {
				window.location = voa_jvars.url + "/";
			}
		});
	}
	
    // <private methods>
	
    /* e.g.
	function say(msg) {
        console.log(msg);
    };
	*/
	
    // check to evaluate whether 'voa' exists in the global namespace - if not, assign window.voa an object literal:
})(window.voa = window.voa || {});