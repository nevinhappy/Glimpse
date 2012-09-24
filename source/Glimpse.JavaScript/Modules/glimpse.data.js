﻿glimpse.data = (function($, pubsub) {
    var innerBaseData = {},
        innerBaseMetadata = {},
        innerCurrentData = {},
        generateRequestAddress = function (requestId) {
            return util.uriTemplate(currentMetadata().resources.glimpse_request, { 'requestId': requestId });
        },
        validateMetadata = function () { 
            // Make sure that out data has metadata
            if (!innerCurrentData.metadata)
                innerCurrentData.metadata = { plugins : {} };  
            
            // Merge metadata from the base metadata, with the request metadata
            var newMetadata = {};
            $.extend(true, newMetadata, innerBaseMetadata, innerCurrentData.metadata);
            innerCurrentData.metadata = newMetadata;
            
            // Make sure that every plugin has metadata object
            for (var key in innerCurrentData.data) {
                if (!innerCurrentData.metadata.plugins[key])
                    innerCurrentData.metadata.plugins[key] = {};
            }
        },
        baseData = function () {
            return innerBaseData;
        },
        currentData = function () {
            return innerCurrentData;
        }, 
        currentMetadata = function () {
            return innerCurrentData.metadata;
        },
        update = function (data) {
            var oldData = innerCurrentData;
            
            pubsub.publish('action.data.changing', data);
            pubsub.publish('action.data.refresh.changing', oldData, data);
            
            // Set the data as current
            innerCurrentData = data;
            
            // Make sure the metadata is correct 
            validateMetadata();
            
            pubsub.publish('action.data.refresh.changing', oldData, data);
            pubsub.publish('action.data.changed', data);
        },
        reset = function () {
            update(innerBaseData);
        },
        retrieve = function (requestId, topic) { 
            topic = topic ? '.' + topic : '';

            pubsub.publish('action.data.retrieve.starting' + topic, { requestId: requestId });

            // Only need to do to the server if we dont have the data
            if (requestId != innerBaseData.requestId) {
                pubsub.publish('action.data.featching' + topic, requestId);
                
                $.get({
                    url: generateRequestAddress(requestId), 
                    contentType: 'application/json',
                    success: function (result) {    
                        pubsub.publish('action.data.featched' + topic, { requestId: requestId, oldData: innerCurrentData, newData: result });
                        
                        pubsub.publish('action.data.retrieve.succeeded' + topic, { requestId: requestId });
                        
                        update(result);  
                    }, 
                    complete: function (jqXhr, textStatus) { 
                        pubsub.publish('action.data.retrieve.completed' + topic, { requestId: requestId, textStatus: textStatus });
                    }
                });
            }
            else { 
                pubsub.publish('action.data.retrieve.succeeded' + topic, { requestId: requestId });
                
                update(innerBaseData);  
                
                pubsub.publish('action.data.retrieve.completed' + topic, { requestId: requestId, textStatus: 'success' });
            }
        },
        initMetadata = function (input) {
            pubsub.publish('action.data.metadata.changing', input);
            
            innerBaseMetadata = input;
            
            pubsub.publish('action.data.metadata.changed', input);
        },
        initData = function (input) { 
            pubsub.publish('action.data.changing', input);
            pubsub.publish('action.data.initial.changing', input);
            
            innerCurrentData = input; 
            innerBaseData = input; 
            
            validateMetadata(); 
            
            pubsub.publish('action.data.initial.changed', input);
            pubsub.publish('action.data.changed', input);
        };

    return {
        baseData: baseData,
        currentData: currentData,
        currentMetadata: currentMetadata,
        update: update,
        reset: reset,
        retrieve: retrieve,
        initMetadata: initMetadata,
        initData: initData
    };
})(jQueryGlimpse, glimpse.pubsub);