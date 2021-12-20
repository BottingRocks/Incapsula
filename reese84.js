ACC.cancelorderactions = {

    _autoload: [
	    ["bindToCancelCompleteOrderButton", $(".js-cancel-complete-order-link").length != 0],
	      "bindToCancelEntryQuantityInput",
     	  "bindToCancelEntryQuantityFocusOut",
	      "bindToCancelEntrySelectedFocusOut",
	      "bindToCancelEntryReasonFocusOut",
    		"bindToReadyFunction",
		    "bindToClickOnSubmit",
		    "bindToUpdateReasonOnClick",
		    "disableEnableCancelSubmit"
    ],

    bindToCancelCompleteOrderButton : function() {
        $(document).on('click', '.js-cancel-complete-order-link', function(event) {
            event.preventDefault();
            $.each( $('[id^="item_quantity_"]'), function(i) {
                $('[name^="cancelEntryQuantityMap[' + i + ']"]').val($('#item_quantity_' + i).val())
            });
            ACC.cancelorderactions.disableEnableCancelSubmit();
        });
    },

    bindToCancelEntryQuantityInput : function() {
        $('input[id^="cancelEntryQuantityMap"]').keypress(function(e) {
            if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57)) {
                return false;
            }
        });
    },

    bindToCancelEntryQuantityFocusOut : function() {
        $('[name^="cancelEntryQuantityMap"]').on('change',function(field) {
            var index = this.id.replace("cancelEntryQuantityMap", "");
            if (parseInt($('#item_quantity_' + index).val()) < parseInt(this.value)) {
                this.value = $('#item_quantity_' + index).val();
            }
            var selectedTotalQty = this.value;
            var totalQty = $('#item_quantity_' + index).val();
            var newQuantityToValidate = totalQty-selectedTotalQty;
            var updatedWList = $(this).parent().parent().parent().parent().find('.entryWarrantyEntryNumber').val();
            var childWarantyTotalQty = $(this).parent().parent().parent().parent().find('.entryWarrantyTotalQty').val();
            if(updatedWList != undefined && updatedWList != '' && childWarantyTotalQty != undefined && childWarantyTotalQty != ''){
            	var quantityToAddInWarranty = 0;
            	if(newQuantityToValidate > childWarantyTotalQty){
            		quantityToAddInWarranty = 0;
            	}else{
            		quantityToAddInWarranty= childWarantyTotalQty-newQuantityToValidate;
            	}
            	var updatedWList= updatedWList.substring(1, updatedWList.length-1);
                if(updatedWList.includes(',')){
                	var array = updatedWList.split(",");
                	var price = 0;
                	var higherEntryNumber=0;
                	var newQty = 0;
                	var qtyToUpdate = 0;
                	var qtyToUpdate = 0;
                	for (i=0;i<array.length;i++){
                		array[i] = array[i].replace(/\s+/g, '');
                	     if($('.item__list--item_loop_cancel_'+array[i]).find('.cancelEntryPrice').val() > price){
                	    	 price = $('.item__list--item_loop_cancel_'+array[i]).find('.cancelEntryPrice').val() ;
                	    	 higherEntryNumber = $('.item__list--item_loop_cancel_'+array[i]).find('.cancelEntryNumber').val();
                	    	 if(quantityToAddInWarranty > $('.item__list--item_loop_cancel_'+array[i]).find('.qtyValue_cancel').text()){
                	    		 qtyToUpdate = $('.item__list--item_loop_cancel_'+array[i]).find('.qtyValue_cancel').text();
                	    		 remainQty = quantityToAddInWarranty - qtyToUpdate;
                	    	 }else{
                	    		 qtyToUpdate = quantityToAddInWarranty;
                	             remainQty = 0 ;
                	    	 }
                	     }
                	}
                	for (i=0;i<array.length;i++){
                		array[i] = array[i].replace(/\s+/g, '');
               	     if( higherEntryNumber != undefined){
               	    	 if( higherEntryNumber == array[i]){
               	    		$('#cancelEntryQuantityMap'+array[i]).val(qtyToUpdate)
               	    		$('.item__quantity-wrapper').find('#cancelEntryQuantityMap'+array[i]).val(qtyToUpdate)
               	    	 } else if(remainQty != 0 && higherEntryNumber != array[i]){
               	    		$('#cancelEntryQuantityMap'+array[i]).val(remainQty)
               	    		$('.item__quantity-wrapper').find('#cancelEntryQuantityMap'+array[i]).val(remainQty)
               	    	 }
               	    	
               	     }
               	}
                	
                }else{
                	var qtyToUpdate ;
                	if(quantityToAddInWarranty > $('.item__list--item_loop_cancel_'+updatedWList).find('.qtyValue_cancel').text()){
       	    		 qtyToUpdate = $('.item__list--item_loop_cancel_'+updatedWList).find('.qtyValue_cancel').text();
       	    		 }else{
       	    		qtyToUpdate= quantityToAddInWarranty;
       	    		 }
                	$('#cancelEntryQuantityMap'+updatedWList).val(qtyToUpdate)
                }
            }
            
            
	    $('[name^="cancelEntryQuantityMap[' + index + ']"]').val(this.value)
	    $('#cancelEntryQuantityMap' + index).val(this.value)
            if($("#cancelEntryQuantityMap"+index).hasClass('required-cancel-field')){
    			$("#cancelEntryQuantityMap"+index).removeClass('required-cancel-field')
    		}
            ACC.cancelorderactions.disableEnableCancelSubmit();
        });
    },

    bindToCancelEntrySelectedFocusOut : function() {
    	$('.checkSelectedValueForCancel').on('change',function(field) {
    		var index = this.id.replace("item_selectedReason_", "");
    		var cancelQty = $("#cancelEntryQuantityMap"+index).val();
		if(cancelQty == ""){
    			$("#cancelEntryQuantityMap"+index).val("0");
    		}
		if($("#item_selectedReason_"+index).hasClass('required-cancel-field')){
    			$("#item_selectedReason_"+index).removeClass('required-cancel-field')
    		}
    		if($("#item_selectedReason_"+index).val() == ''){
    			$("#cancelComment_"+index).css("display", "none");
    		}
    		if($("#item_selectedReason_"+index).val() != '' ){
    			if($("#item_selectedReason_"+index).val() !='Other'){
    				$("#cancelOrderButtonConfirmation").prop("disabled", false);
   				    $("#cancelComment_"+index).css("display", "none");
    			}
    			if($("#item_selectedReason_"+index).val() =='Other'){
    				$("#cancelOrderButtonConfirmation").prop("disabled", false);
    				$("#cancelComment_"+index).css("display", "block");
    			}
    		}
    		
    		var updatedWList = $(this).parent().parent().parent().find('.entryWarrantyEntryNumber').val();
            var childWarantyTotalQty = $(this).parent().parent().parent().find('.entryWarrantyTotalQty').val();
            var selectedTotalQty = $("#cancelEntryQuantityMap"+index).val();
            var totalQty = $('#item_quantity_' + index).val();
            var newQuantityToValidate = totalQty-selectedTotalQty;
            if(updatedWList != undefined && updatedWList != '' && childWarantyTotalQty != undefined && childWarantyTotalQty != '' 
            	){
            	var quantityToAddInWarranty = 0;
            	if(newQuantityToValidate > childWarantyTotalQty){
            		quantityToAddInWarranty = 0;
            	}else{
            		quantityToAddInWarranty= childWarantyTotalQty-newQuantityToValidate;
            	}
            	var updatedWList= updatedWList.substring(1, updatedWList.length-1);
                if(updatedWList.includes(',')){
                	var array = updatedWList.split(",");
                	for (i=0;i<array.length;i++){
                		array[i] = array[i].replace(/\s+/g, '');
               	     if( $('#cancelEntryQuantityMap'+array[i]).val() != undefined && $('#cancelEntryQuantityMap'+array[i]).val() > 0 ){
               	    	$("#item_selectedReason_"+array[i]).val($("#item_selectedReason_"+index).val())
               	    	if($("#item_selectedReason_"+array[i]).val() !='Other'){
               	    		$("#cancelComment_"+array[i]).css("display", "none");
               	    	}else if($("#item_selectedReason_"+index).val() =='Other'){
               	    		$("#cancelComment_"+array[i]).css("display", "block");
               	    	}
               	     }
               	}
                	
                }else{
                	if( $('#cancelEntryQuantityMap'+updatedWList).val() != undefined && $('#cancelEntryQuantityMap'+updatedWList).val() > 0  ){
               	    	$("#item_selectedReason_"+updatedWList).val($("#item_selectedReason_"+index).val())
               	    	if($("#item_selectedReason_"+updatedWList).val() !='Other'){
               	    		$("#cancelComment_"+updatedWList).css("display", "none");
               	    	}else if($("#item_selectedReason_"+index).val() =='Other'){
               	    		$("#cancelComment_"+updatedWList).css("display", "block");
               	    	}
               	     }
                }
            }
            
    		
    		ACC.cancelorderactions.disableEnableCancelSubmit();
    	});
    },

    bindToCancelEntryReasonFocusOut : function() {
    	$('.cancelComment').on('change',function(field) {
    		var index = this.id.replace("cancelComment_", "");
		    var cancelQty = $("#cancelEntryQuantityMap"+index).val();
    		if(cancelQty == ""){
    			$("#cancelEntryQuantityMap"+index).val("0");
    		}
    		if($("#cancelComment_"+index).hasClass('required-cancel-field')){
    			$("#cancelComment_"+index).removeClass('required-cancel-field')
    		}
    		
    		var updatedWList = $(this).parent().parent().parent().find('.entryWarrantyEntryNumber').val();
            var childWarantyTotalQty = $(this).parent().parent().parent().find('.entryWarrantyTotalQty').val();
            var selectedTotalQty = $("#cancelEntryQuantityMap"+index).val();
            var totalQty = $('#item_quantity_' + index).val();
            var newQuantityToValidate = totalQty-selectedTotalQty;
            if(updatedWList != undefined && updatedWList != '' && childWarantyTotalQty != undefined && childWarantyTotalQty != '' 
            	){
            	var quantityToAddInWarranty = 0;
            	if(newQuantityToValidate > childWarantyTotalQty){
            		quantityToAddInWarranty = 0;
            	}else{
            		quantityToAddInWarranty= childWarantyTotalQty-newQuantityToValidate;
            	}
            	var updatedWList= updatedWList.substring(1, updatedWList.length-1);
                if(updatedWList.includes(',')){
                	var array = updatedWList.split(",");
                	for (i=0;i<array.length;i++){
                		array[i] = array[i].replace(/\s+/g, '');
               	     if( $('#cancelEntryQuantityMap'+array[i]).val() != undefined && $('#cancelEntryQuantityMap'+array[i]).val() > 0 ){
               	    	$("#cancelComment_"+array[i]).val($("#cancelComment_"+index).val())
               	     }
               	}
                	
                }else{
                	if( $('#cancelEntryQuantityMap'+updatedWList).val() != undefined && $('#cancelEntryQuantityMap'+updatedWList).val() > 0  ){
               	    	$("#cancelComment_"+updatedWList).val($("#cancelComment_"+index).val())
               	     }
                }
            }
    		
    	});
    },

    bindToReadyFunction : function() {
    	window.onload = function() {
    		 var previousPageUrl = document.referrer;
    		 if(previousPageUrl != null && previousPageUrl != undefined && previousPageUrl.includes("sort=byDate")){
    			 $(".page-cancel-order .back-link a").attr('href', previousPageUrl);
    		 }
    		$(".item__list--item_loop").each(function(i){
    			var cancelQty = $("#cancelEntryQuantityMap"+i).val();
    			var selectedReason = $("#item_selectedReason_"+i).val();
    			var selectedComment = $("#cancelComment_"+i).val();
    			if(selectedReason != '' && selectedReason =='Other'){
    				$("#cancelComment_"+i).css('display','block');
    			}
    		});

    		var errorMessage = $('.error_message_cancel').text();
    		var validationError = $('.errormessageforCancel').val();
    		if(validationError != undefined && validationError != null && validationError != "" && validationError == "errorPresent"){
    			$('.global-alerts').show();
    			 var count = 0;
    			 $(".item__list--item_loop").each(function(i){
    				 var cancelQty = $("#cancelEntryQuantityMap"+i).val();
    				 var selectedReason = $("#item_selectedReason_"+i).val();
    				 var selectedComment = $("#cancelComment_"+i).val();
    				 if(cancelQty > 0){
    					 if(selectedReason == ""){
    						 $("#item_selectedReason_"+i).addClass("required-cancel-field");
    					 }
    					 else{
    						 if(selectedReason != "" && selectedReason == "Other"){
    							 if(selectedComment == ""){
    								 $("#cancelComment_"+i).addClass("required-cancel-field");
    							 }
    						 }
    					 }
    				 }
    				 if(selectedReason !=""){
    					 if(cancelQty == 0){
    						 $("#cancelEntryQuantityMap"+i).addClass("required-cancel-field");
    					 }
    					 if(selectedReason == "Other" ){
    						 if(selectedComment == "" ){
    							 $("#cancelComment_"+i).addClass("required-cancel-field");
    						 }
    						 if(selectedComment != "" && selectedComment.length >= 51){
    							 $("#cancelComment_"+i).addClass("required-cancel-field");
    						 }
    					 }
    				 }

    				 if(selectedComment != ""){
    					 if(cancelQty == 0){
    						 $("#cancelEntryQuantityMap"+i).addClass("required-cancel-field");
    						 count++;
    					 }
    				 }
    			 });
    		}
    	}
    },

    //Enable submit button in case some value is more than zero.
    disableEnableCancelSubmit: function() {
    	var submitDisabled = true;
          	$.each( $('[id^="item_quantity_"]'), function(i) {
          		var cancelEntryNumber= $(this).attr('quantityValue');
          		if(i != cancelEntryNumber){
          			i= cancelEntryNumber;
          		}
          		if (parseInt($('[name^="cancelEntryQuantityMap[' + i + ']"]').val()) > 0  && ($('#item_selectedReason_'+i).val() != '' && $('#item_selectedReason_'+i).val() != undefined)) {
       	       submitDisabled = false;
       	       }
       	       });
    	$("#cancelOrderButtonConfirmation").prop("disabled", submitDisabled);
    },
    
    bindToUpdateReasonOnClick: function() {
    	$('.order-detail-bundle-container .order-detail-product-bundle .cancelEntryQuantityMap').on('change',function(field) {
    		var index = this.id.replace("cancelComment_", "");
    		var entry = index.slice(-1);
		    var cancelQty = this.value;
		    
		    $('.order-detail-bundle-container_'+entry).find(".order-detail-child-product").each(function(i){
		    	//$(this).find(".ddddd").text($('.ddddd').val(cancelQty));
		    	$(this).find(".updateQuantityChild").val(cancelQty);
		    });
    	});
    	
    	$('.order-detail-bundle-container .order-detail-product-bundle .checkSelectedValue').on('change',function(field) {	
    		var index = this.id.replace("cancelComment_", "");
    		var entry = index.slice(-1);
		    var cancelQty = this.value;
		   
		    	if(cancelQty == ''){
		    		$(this).next(".cancelComment").css("display", "none");
	    		}
	    		if(cancelQty != '' && cancelQty !='Other'){
	    			$(this).next(".cancelComment").css("display", "none");
	    		}if(cancelQty =='Other'){
	    			$(this).next(".cancelComment").css("display", "block");
	    		}
		    
		    $('.order-detail-bundle-container_'+entry).find(".order-detail-child-product").each(function(i){
		    	//$(this).find(".ddddd").text($('.ddddd').val(cancelQty));
		    	$(this).find(".updateReasonChild").val(cancelQty);
		    	
		    	if($(this).find(".updateReasonChild").val() == ''){
		    		$(this).find(".updateCancelChild").css("display", "none");
	    		}
	    		if($(this).find(".updateReasonChild").val() != '' && $(this).find(".updateReasonChild").val() !='Other'){
	    			$(this).find(".updateCancelChild").css("display", "none");
	    			
	    		}if($(this).find(".updateReasonChild").val() =='Other'){
	    			$(this).find(".updateCancelChild").css("display", "block");
	    		}
		    	
		    	
		    });
		    
    	});
    	
    	$('.order-detail-bundle-container .order-detail-product-bundle .cancelComment').on('input',function(field) {
    		var index = this.id.replace("cancelComment_", "");
    		var entry = index.slice(-1);
		    var cancelQty = this.value;
		    
		    $('.order-detail-bundle-container_'+entry).find(".order-detail-child-product").each(function(i){
		    	$(this).find(".updateCancelChild").val(cancelQty);
		    });
    	});
    },

    bindToClickOnSubmit: function() {
        	$(document).on('click', '#cancelOrderButtonConfirmation', function(e){
                e.preventDefault();
                var errorMessage = $('.error_message_cancel').text();
                var count = 0;
                $('.global-alerts').remove();
                $(".item__list--item_loop").each(function(i){
                var cancelEntryNumber= $(this).find('.cancelEntryNumber').val();
                    			if(i != cancelEntryNumber && cancelEntryNumber != undefined){
                    				i= cancelEntryNumber;
                    			}
                	var cancelQty = $("#cancelEntryQuantityMap"+i).val();
                	var entryMaxQty = $(this).find('.qtyValue_cancel').text()
                	var updatedWList = $(this).find('.entryWarrantyEntryNumber').val();
                	if(updatedWList != '' && updatedWList != undefined){
                		remainingParentQty = entryMaxQty - cancelQty;
                		var totalWarrantyQty = $(this).find('.entryWarrantyTotalQty').val();
                		var childRemainQty = 0;
                		var updatedWList= updatedWList.substring(1, updatedWList.length-1);
                		var warantyTotalCount = 0 ;
                		 if(updatedWList.includes(',')){
                			 var array = updatedWList.split(","); 
                				for (j=0;j<array.length;j++){
                		                		array[j] = array[j].replace(/\s+/g, '');
                		                		warantyTotalCount = parseInt(warantyTotalCount, 10) + parseInt($('#cancelEntryQuantityMap'+array[j]).val(), 10);
                		               	    
                		               	}
                				childRemainQty = parseInt(totalWarrantyQty, 10)-parseInt(warantyTotalCount, 10);
                				if(childRemainQty > remainingParentQty){
                					count++;
                					for (k=0;k<array.length;k++){
        		                		array[k] = array[k].replace(/\s+/g, '');
        		                		$("#cancelEntryQuantityMap"+array[k]).addClass("required-cancel-field");
        		                		//warantyTotalCount = warantyTotalCount + $('#cancelEntryQuantityMap'+array[i]).val(qtyToUpdate)
        		               	    
        		               	}
                					
                					}
                				}
                		 else{
                			 warantyTotalCount = $('#cancelEntryQuantityMap'+updatedWList).val();
                			 childRemainQty = totalWarrantyQty-warantyTotalCount;
                			 if(childRemainQty > remainingParentQty){
             					count++;            					
     		                	$("#cancelEntryQuantityMap"+updatedWList).addClass("required-cancel-field");
             					}
                	}
                	}
                	
                	var selectedReason = $("#item_selectedReason_"+i).val();
                	var selectedComment = $("#cancelComment_"+i).val();
			      if(cancelQty == ""){
    				    $("#cancelEntryQuantityMap"+i).val("0");
    				      cancelQty= $("#cancelEntryQuantityMap"+i).val();
    			  }
            		if(cancelQty > 0){
            			if(selectedReason == "" || selectedReason == undefined){
            				count++;
            				$("#item_selectedReason_"+i).addClass("required-cancel-field");
            			}
            			else{
            				if(selectedReason != "" && selectedReason == "Other"){
            					if(selectedComment == ""){
            						$("#cancelComment_"+i).addClass("required-cancel-field");
            						count++;
            					}
            				}
            			}
            		}
            	if(selectedReason !=""){
            		if(cancelQty == 0){
            			$("#cancelEntryQuantityMap"+i).addClass("required-cancel-field");
            			count++;
            		}
            		 if(selectedReason == "Other" ){

                		if(selectedComment == "" || selectedComment == undefined){
                			$("#cancelComment_"+i).addClass("required-cancel-field");
                			count++;
                		}
                		if(selectedComment != "" && selectedComment.length >= 201){
                			$("#cancelComment_"+i).addClass("required-cancel-field");
                			count++;
                		}
                	}
            	}

            	if(selectedComment != "" && selectedReason == "Other"){
            		if(cancelQty == 0){
            			$("#cancelEntryQuantityMap"+i).addClass("required-cancel-field");
            			count++;
            		}
            	}

            		});
                if(count == 0){
                $('#confirmcancelorderForm').submit();

                }else{
                	$('div.main-content').prepend('<div class="global-alerts"><div class="alert alert-danger alert-dismissable"><button class="close" aria-hidden="true" data-dismiss="alert" type="button">×</button>'+ errorMessage+'</div></div>');
                	$('.global-alerts').show();
                }

            });
        }
};
